import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'

import { dbClient } from '../../db/client.js'
import { type PaperAuthor, paper, paperUser, user } from '../../db/schema.js'
import { auth } from '../auth.js'
import type { CmtAuthor, CmtPaper, CmtParseResult } from './cmt.js'

/**
 * Import of the CMT paper list into `paper` / `paper_user`.
 *
 * - Accepted papers in the file are inserted or updated (CMT Paper ID = paper.id).
 * - Their author rows are rewritten from the file.
 * - Active papers missing from the file are soft-deactivated (is_active=false);
 *   a deactivated paper that appears again is reactivated.
 * - Author emails without an account get one (role "user", no password,
 *   unverified), like participants created by the seed. Existing accounts are
 *   linked as-is (their names are not changed).
 */

export interface ImportSummary {
  totalRows: number
  accepted: number
  newPapers: number[]
  updatedPapers: number[]
  reactivatedPapers: number[]
  unchangedPapers: number
  deactivatedPapers: { id: number; title: string }[]
  newUsers: { email: string; name: string }[]
  authorLinks: number
  warnings: string[]
}

type ExistingPaper = typeof paper.$inferSelect

const sameTime = (a: Date | null, b: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null)

const authorKey = (
  a: Pick<
    CmtAuthor,
    'email' | 'isPrimaryContact' | 'order' | 'name' | 'affiliation'
  >
) =>
  JSON.stringify([a.email, a.isPrimaryContact, a.order, a.name, a.affiliation])

// Field by field: jsonb does not keep key order, so JSON.stringify of the
// stored value can differ from a freshly parsed one.
const authorListKey = (list: PaperAuthor[]) =>
  JSON.stringify(
    list.map((a) => [a.order, a.name, a.affiliation, a.isPrimaryContact])
  )

function paperChanged(
  p: CmtPaper,
  old: ExistingPaper,
  oldAuthors: string[]
): boolean {
  return (
    p.title !== old.title ||
    p.abstract !== old.abstract ||
    p.primarySubjectArea !== old.primarySubjectArea ||
    p.secondarySubjectAreas !== old.secondarySubjectAreas ||
    p.trackName !== old.trackName ||
    p.status !== old.status ||
    authorListKey(p.authorList) !== authorListKey(old.authorList) ||
    !sameTime(p.cmtCreatedAt, old.cmtCreatedAt) ||
    !sameTime(p.cmtModifiedAt, old.cmtModifiedAt) ||
    p.authors.map(authorKey).join('\n') !== oldAuthors.join('\n')
  )
}

/** user id by lowercased email, for the given emails. */
async function findUsers(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map()
  const rows = await dbClient
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(sql`lower(${user.email})`, emails))
  return new Map(rows.map((r) => [r.email.toLowerCase(), r.id]))
}

/** Compare the parsed file with the database. Read-only. */
export async function planImport(
  parsed: CmtParseResult
): Promise<ImportSummary> {
  const { papers } = parsed
  const ids = papers.map((p) => p.id)

  const existing = await dbClient.select().from(paper)
  const existingById = new Map(existing.map((p) => [p.id, p]))

  const existingAuthors = ids.length
    ? await dbClient
        .select()
        .from(paperUser)
        .where(inArray(paperUser.paperId, ids))
        .orderBy(paperUser.paperId, paperUser.authorOrder)
    : []
  const authorsByPaper = new Map<number, string[]>()
  for (const a of existingAuthors) {
    const list = authorsByPaper.get(a.paperId) ?? []
    list.push(
      authorKey({
        email: a.email,
        isPrimaryContact: a.isPrimaryContact,
        order: a.authorOrder,
        name: a.authorName,
        affiliation: a.affiliation,
      })
    )
    authorsByPaper.set(a.paperId, list)
  }

  const summary: ImportSummary = {
    totalRows: parsed.totalRows,
    accepted: papers.length,
    newPapers: [],
    updatedPapers: [],
    reactivatedPapers: [],
    unchangedPapers: 0,
    deactivatedPapers: [],
    newUsers: [],
    authorLinks: 0,
    warnings: parsed.warnings,
  }

  for (const p of papers) {
    const old = existingById.get(p.id)
    summary.authorLinks += p.authors.length
    if (!old) summary.newPapers.push(p.id)
    else if (!old.isActive) summary.reactivatedPapers.push(p.id)
    else if (paperChanged(p, old, authorsByPaper.get(p.id) ?? []))
      summary.updatedPapers.push(p.id)
    else summary.unchangedPapers++
  }

  const inFile = new Set(ids)
  summary.deactivatedPapers = existing
    .filter((p) => p.isActive && !inFile.has(p.id))
    .map((p) => ({ id: p.id, title: p.title }))
    .sort((a, b) => a.id - b.id)

  // First name seen for each email is used for the new account.
  const nameByEmail = new Map<string, string>()
  for (const p of papers)
    for (const a of p.authors)
      if (!nameByEmail.has(a.email)) nameByEmail.set(a.email, a.name)
  const known = await findUsers([...nameByEmail.keys()])
  summary.newUsers = [...nameByEmail]
    .filter(([email]) => !known.has(email))
    .map(([email, name]) => ({ email, name }))

  return summary
}

export class ImportRefusedError extends Error {}

/** Apply the import. Returns the summary of what was done. */
export async function applyImport(
  parsed: CmtParseResult
): Promise<ImportSummary> {
  if (parsed.papers.length === 0) {
    // Almost certainly the wrong file; applying it would deactivate every paper.
    throw new ImportRefusedError(
      'The file has no accepted papers. Nothing was imported.'
    )
  }

  const summary = await planImport(parsed)

  // 1. Accounts. Created through better-auth (outside the transaction below;
  //    if that fails, the accounts simply already exist on the next attempt).
  for (const u of summary.newUsers) {
    try {
      await auth.api.createUser({
        body: {
          email: u.email,
          name: u.name,
          role: 'user',
          data: { emailVerified: false },
        },
      })
    } catch (e: any) {
      if (e?.body?.code !== 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        throw new Error(
          `Could not create account for ${u.email}: ${e?.body?.message ?? e?.message ?? e}`
        )
      }
    }
  }

  const emails = [
    ...new Set(parsed.papers.flatMap((p) => p.authors.map((a) => a.email))),
  ]
  const userIds = await findUsers(emails)
  const missing = emails.filter((e) => !userIds.has(e))
  if (missing.length)
    throw new Error(`Accounts missing after creation: ${missing.join(', ')}`)

  // 2. Papers and author links, all or nothing.
  const now = new Date()
  const ids = parsed.papers.map((p) => p.id)
  const toWrite = new Set([
    ...summary.newPapers,
    ...summary.updatedPapers,
    ...summary.reactivatedPapers,
  ])

  await dbClient.transaction(async (tx) => {
    const rows = parsed.papers
      .filter((p) => toWrite.has(p.id))
      .map((p) => ({
        id: p.id,
        title: p.title,
        abstract: p.abstract,
        primarySubjectArea: p.primarySubjectArea,
        secondarySubjectAreas: p.secondarySubjectAreas,
        trackName: p.trackName,
        status: p.status,
        authorList: p.authorList,
        cmtCreatedAt: p.cmtCreatedAt,
        cmtModifiedAt: p.cmtModifiedAt,
        isActive: true,
        importedAt: now,
        updatedAt: now,
      }))
    if (rows.length) {
      await tx
        .insert(paper)
        .values(rows)
        .onConflictDoUpdate({
          target: paper.id,
          set: {
            title: sql`excluded.title`,
            abstract: sql`excluded.abstract`,
            primarySubjectArea: sql`excluded.primary_subject_area`,
            secondarySubjectAreas: sql`excluded.secondary_subject_areas`,
            trackName: sql`excluded.track_name`,
            status: sql`excluded.status`,
            authorList: sql`excluded.author_list`,
            cmtCreatedAt: sql`excluded.cmt_created_at`,
            cmtModifiedAt: sql`excluded.cmt_modified_at`,
            isActive: sql`excluded.is_active`,
            importedAt: sql`excluded.imported_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        })
    }

    // Unchanged papers: just record that this import saw them.
    // (updatedAt is set to itself, or $onUpdate would bump it.)
    await tx
      .update(paper)
      .set({ importedAt: now, updatedAt: sql`${paper.updatedAt}` })
      .where(inArray(paper.id, ids))

    // Author links: replace for every paper in the file.
    await tx.delete(paperUser).where(inArray(paperUser.paperId, ids))
    const links = parsed.papers.flatMap((p) =>
      p.authors.map((a) => ({
        paperId: p.id,
        userId: userIds.get(a.email)!,
        email: a.email,
        isPrimaryContact: a.isPrimaryContact,
        authorOrder: a.order,
        authorName: a.name,
        affiliation: a.affiliation,
      }))
    )
    if (links.length) await tx.insert(paperUser).values(links)

    // No longer accepted (or missing from the file): soft-deactivate.
    await tx
      .update(paper)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(paper.isActive, true), notInArray(paper.id, ids)))
  })

  return summary
}
