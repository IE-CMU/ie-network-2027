/**
 * Display formatting of author names and affiliations typed into CMT.
 *
 * Only words that are clearly unformatted are changed:
 * - all-lowercase words are capitalized ("nivit" -> "Nivit");
 * - ALL-CAPS words are capitalized only when the whole text is in caps
 *   ("UTTAPOL SMUTKUPT" -> "Uttapol Smutkupt"), so acronyms like "CMU" inside
 *   normal text are kept;
 * - mixed-case words ("McDonald", "DeVries") are left as typed.
 * Letters after "-" and "'" are capitalized too ("pisutha-arnond" -> "Pisutha-Arnond").
 * Scripts without case (e.g. Thai) are unchanged.
 */

/** Kept lowercase in affiliations unless they start the text or a comma part. */
const SMALL_WORDS = new Set(['of', 'at', 'and', 'the', 'for', 'in', 'on', 'de', 'la'])

/**
 * Written in capitals in affiliations whatever the input case ("cmu" -> "CMU").
 * A lowercase acronym can't be told apart from a word, so add new ones here.
 */
const ACRONYMS = new Set([
  'CMU',
  'KMUTT',
  'KMITL',
  'KMUTNB',
  'SIIT',
  'AIT',
  'NIDA',
  'PSU',
  'KKU',
  'MFU',
  'SUT',
  'NSTDA',
  'NECTEC',
  'MTEC',
])

// A run of letters (with combining marks) joined by - or '.
const WORD_RE = /[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*/gu

const isLower = (s: string) => s === s.toLowerCase() && s !== s.toUpperCase()
const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase()

function capitalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase())
}

function format(value: string, isAffiliation: boolean): string {
  const text = value.trim().replace(/\s+/g, ' ')
  const words = text.match(WORD_RE) ?? []
  // A lone ALL-CAPS affiliation ("MIT") is most likely an acronym.
  const allCaps = isUpper(text) && !(isAffiliation && words.length === 1)

  let atStart = true
  return text.replace(/[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*|[,;:(]/gu, (m) => {
    if (/^[,;:(]$/.test(m)) {
      atStart = true
      return m
    }
    const start = atStart
    atStart = false
    if (isAffiliation) {
      const upper = m.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      const lower = m.toLowerCase()
      if (!start && SMALL_WORDS.has(lower)) return lower
    }
    if (isLower(m) || (allCaps && isUpper(m))) return capitalize(m)
    return m
  })
}

export const formatAuthorName = (name: string) => format(name, false)

export const formatAffiliation = (affiliation: string) =>
  format(affiliation, true)
