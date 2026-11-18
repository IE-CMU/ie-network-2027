import { dbClient } from '../../db/client.js'

/** One row of the admin paper table (see PaperTable.vue). */
export interface AdminPaperRow {
  id: number
  title: string
  primarySubjectArea: string | null
  status: string
  isActive: boolean
  primaryContact: { name: string; email: string } | null
  authorCount: number
  // Every author's name and email, lowercased, for searching.
  authorSearch: string
}

export interface AdminPaperList {
  papers: AdminPaperRow[]
  /** Number of active papers. */
  activeCount: number
  /** Distinct authors across active papers. */
  authorCount: number
  /** Latest `importedAt` over all papers, or null when there are none. */
  lastImport: Date | null
}

/** Load all papers (active and deactivated) for the admin paper list. */
export async function loadAdminPaperList(): Promise<AdminPaperList> {
  const rows = await dbClient.query.paper.findMany({
    orderBy: (p, { asc }) => [asc(p.id)],
    with: {
      authors: {
        orderBy: (a, { asc }) => [asc(a.authorOrder)],
        with: { user: { columns: { name: true, email: true } } },
      },
    },
  })

  const papers = rows.map((p): AdminPaperRow => {
    const contact = p.authors.find((a) => a.isPrimaryContact)
    return {
      id: p.id,
      title: p.title,
      primarySubjectArea: p.primarySubjectArea,
      status: p.status,
      isActive: p.isActive,
      primaryContact: contact ? { name: contact.user.name, email: contact.user.email } : null,
      authorCount: p.authors.length,
      authorSearch: p.authors
        .map((a) => `${a.user.name} ${a.user.email}`)
        .join(' ')
        .toLowerCase(),
    }
  })

  const active = rows.filter((p) => p.isActive)
  return {
    papers,
    activeCount: active.length,
    authorCount: new Set(active.flatMap((p) => p.authors.map((a) => a.userId))).size,
    lastImport: rows.reduce<Date | null>(
      (max, p) => (!max || p.importedAt > max ? p.importedAt : max),
      null
    ),
  }
}
