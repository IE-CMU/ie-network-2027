import { XMLParser } from 'fast-xml-parser'

import { formatAffiliation, formatAuthorName } from './format.js'

/**
 * Parser for the Microsoft CMT "paper list" export.
 *
 * Despite the .xls extension, CMT exports Excel 2003 XML (SpreadsheetML):
 * <Workbook><Worksheet><Table><Row><Cell><Data><![CDATA[...]]></Data>...
 * Row 1 is a title ("IENETWORK2027"); the header row is found by looking for
 * the required column names, and columns are read by header name, not position.
 */

export interface CmtAuthor {
  email: string // trimmed + lowercased
  // Formatted for display (see format.ts). Used only when the import creates
  // the author's account; existing accounts keep their own name/affiliation.
  name: string
  affiliation: string | null
  isPrimaryContact: boolean
  order: number // 1-based position in the author list
}

export interface CmtPaper {
  id: number // CMT Paper ID
  title: string
  abstract: string | null
  primarySubjectArea: string | null
  secondarySubjectAreas: string | null
  trackName: string | null
  status: string
  cmtCreatedAt: Date | null
  cmtModifiedAt: Date | null
  authors: CmtAuthor[]
}

export interface CmtParseResult {
  /** Accepted papers only (status contains "accept"). */
  papers: CmtPaper[]
  /** Number of paper rows in the file, accepted or not. */
  totalRows: number
  /** Non-fatal problems; the affected row/author is skipped or degraded. */
  warnings: string[]
}

export class CmtParseError extends Error {}

const COL = {
  id: 'Paper ID',
  created: 'Created',
  modified: 'Last Modified',
  title: 'Paper Title',
  abstract: 'Abstract',
  authors: 'Authors',
  authorNames: 'Author Names',
  authorEmails: 'Author Emails',
  track: 'Track Name',
  primarySubject: 'Primary Subject Area',
  secondarySubjects: 'Secondary Subject Areas',
  status: 'Status',
} as const

const REQUIRED = [COL.id, COL.title, COL.authorEmails, COL.status]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true, // ss:Index -> Index
  parseTagValue: false, // keep every cell as a string
  trimValues: false,
  isArray: (name) => ['Worksheet', 'Row', 'Cell'].includes(name),
})

/** Text content of a <Cell>, '' if empty. */
function cellText(cell: any): string {
  const data = cell?.Data
  if (data == null) return ''
  if (typeof data === 'string') return data
  const text = data['#text']
  return text == null ? '' : String(text)
}

/** Row -> array of cell strings, honouring ss:Index for sparse rows. */
function rowValues(row: any): string[] {
  const out: string[] = []
  for (const cell of row?.Cell ?? []) {
    const idx = cell?.['@_Index']
    if (idx != null) out.length = Math.max(out.length, Number(idx) - 1)
    out.push(cellText(cell))
  }
  return Array.from(out, (v) => v ?? '')
}

/** Split a "; "-separated CMT list. Empty input -> []. */
function splitList(value: string): string[] {
  return value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Remove the trailing primary-contact asterisk. */
function stripStar(value: string): { text: string; star: boolean } {
  const star = value.endsWith('*')
  return { text: (star ? value.slice(0, -1) : value).trim(), star }
}

/**
 * "Chawis Boonmee (Chiang Mai University)" -> name + affiliation.
 * The affiliation is the last balanced (...) group, so parentheses inside it
 * are kept.
 */
function splitAffiliation(value: string): {
  name: string
  affiliation: string | null
} {
  if (!value.endsWith(')')) return { name: value, affiliation: null }
  let depth = 0
  for (let i = value.length - 1; i >= 0; i--) {
    if (value[i] === ')') depth++
    else if (value[i] === '(' && --depth === 0) {
      const name = value.slice(0, i).trim()
      const affiliation = value.slice(i + 1, -1).trim()
      return name
        ? { name, affiliation: affiliation || null }
        : { name: value, affiliation: null }
    }
  }
  return { name: value, affiliation: null }
}

/** "Boonmee, Chawis" -> "Chawis Boonmee" (CMT's "Author Names" format). */
function lastFirstToName(value: string): string {
  const comma = value.indexOf(',')
  if (comma < 0) return value.trim()
  const last = value.slice(0, comma).trim()
  const first = value.slice(comma + 1).trim()
  return [first, last].filter(Boolean).join(' ')
}

/** CMT dates: "9/17/2026 3:45:07 AM +00:00" (M/D/YYYY, 12-hour clock). */
export function parseCmtDate(value: string): Date | null {
  const m = value
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM) ([+-])(\d{2}):(\d{2})$/i
    )
  if (!m) return null
  const [, mo, d, y, h, mi, s, ampm, sign, oh, om] = m
  let hour = Number(h) % 12
  if (ampm.toUpperCase() === 'PM') hour += 12
  const offsetMin = (Number(oh) * 60 + Number(om)) * (sign === '-' ? -1 : 1)
  const utc = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    hour,
    Number(mi),
    Number(s)
  )
  return new Date(utc - offsetMin * 60_000)
}

export function isAcceptedStatus(status: string): boolean {
  return status.toLowerCase().includes('accept')
}

function parseAuthors(
  paperId: number,
  emailsCell: string,
  authorsCell: string,
  namesCell: string,
  warnings: string[]
): CmtAuthor[] {
  const emails = splitList(emailsCell).map(stripStar)
  const authors = splitList(authorsCell).map((a) =>
    splitAffiliation(stripStar(a).text)
  )
  const names = splitList(namesCell).map((n) =>
    lastFirstToName(stripStar(n).text)
  )

  // The three columns line up by position. If "Authors" doesn't (e.g. an
  // affiliation containing ';'), fall back to "Author Names" for the name.
  const useAuthors = authors.length === emails.length
  const useNames = names.length === emails.length
  if (!useAuthors) {
    warnings.push(
      `Paper ${paperId}: "Authors" has ${authors.length} entries but "Author Emails" has ${emails.length}; affiliations skipped.`
    )
  }

  const result: CmtAuthor[] = []
  const seen = new Map<string, CmtAuthor>()
  emails.forEach(({ text, star }, i) => {
    const email = text.toLowerCase()
    if (!EMAIL_RE.test(email)) {
      warnings.push(`Paper ${paperId}: invalid author email "${text}" skipped.`)
      return
    }
    const dup = seen.get(email)
    if (dup) {
      dup.isPrimaryContact ||= star
      warnings.push(
        `Paper ${paperId}: author email ${email} listed twice; kept once.`
      )
      return
    }
    const name =
      (useAuthors && authors[i].name) ||
      (useNames && names[i]) ||
      email.split('@')[0]
    const affiliation = useAuthors ? authors[i].affiliation : null
    const author: CmtAuthor = {
      email,
      name: formatAuthorName(name),
      affiliation: affiliation && formatAffiliation(affiliation),
      isPrimaryContact: star,
      order: result.length + 1,
    }
    seen.set(email, author)
    result.push(author)
  })

  if (result.length > 0 && !result.some((a) => a.isPrimaryContact)) {
    warnings.push(`Paper ${paperId}: no primary contact (*) marked.`)
  }
  return result
}

export function parseCmtPaperList(content: string): CmtParseResult {
  let doc: any
  try {
    doc = xml.parse(content)
  } catch (e) {
    throw new CmtParseError(
      `Not a valid CMT export (XML parse failed: ${(e as Error).message})`
    )
  }

  const rows: any[] = doc?.Workbook?.Worksheet?.[0]?.Table?.Row ?? []
  if (rows.length === 0) {
    throw new CmtParseError(
      'Not a valid CMT export (no worksheet rows found). Upload the paper list exported from CMT.'
    )
  }

  const values = rows.map(rowValues)
  const headerIdx = values.findIndex((r) =>
    REQUIRED.every((h) => r.map((c) => c.trim()).includes(h))
  )
  if (headerIdx < 0) {
    throw new CmtParseError(
      `Header row not found. Required columns: ${REQUIRED.join(', ')}`
    )
  }
  const header = values[headerIdx].map((c) => c.trim())
  const col = (row: string[], name: string) => {
    const i = header.indexOf(name)
    return i < 0 ? '' : (row[i] ?? '').trim()
  }
  const orNull = (v: string) => (v === '' ? null : v)

  const warnings: string[] = []
  const papers: CmtPaper[] = []
  const seenIds = new Set<number>()
  let totalRows = 0

  for (const row of values.slice(headerIdx + 1)) {
    if (row.every((c) => c.trim() === '')) continue
    totalRows++

    const rawId = col(row, COL.id)
    const id = Number(rawId)
    if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id)) {
      warnings.push(`Row with Paper ID "${rawId}" skipped: not a number.`)
      continue
    }

    const status = col(row, COL.status)
    if (!isAcceptedStatus(status)) continue

    if (seenIds.has(id)) {
      warnings.push(
        `Paper ${id} appears more than once; only the first row is used.`
      )
      continue
    }
    seenIds.add(id)

    const title = col(row, COL.title)
    if (!title) warnings.push(`Paper ${id}: empty title.`)

    const authors = parseAuthors(
      id,
      col(row, COL.authorEmails),
      col(row, COL.authors),
      col(row, COL.authorNames),
      warnings
    )
    if (authors.length === 0)
      warnings.push(`Paper ${id}: no valid author emails.`)

    papers.push({
      id,
      title,
      abstract: orNull(col(row, COL.abstract)),
      primarySubjectArea: orNull(col(row, COL.primarySubject)),
      secondarySubjectAreas: orNull(col(row, COL.secondarySubjects)),
      trackName: orNull(col(row, COL.track)),
      status,
      cmtCreatedAt: parseCmtDate(col(row, COL.created)),
      cmtModifiedAt: parseCmtDate(col(row, COL.modified)),
      authors,
    })
  }

  return { papers, totalRows, warnings }
}
