import type { EvidenceMimeType } from '../../utils/typeChangeRequest.js'

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  bytes.length >= offset + sig.length && sig.every((b, i) => bytes[offset + i] === b)

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

/**
 * Detect an evidence file's type from its first bytes. The type the browser
 * reports and the file extension can't be trusted. Returns null for anything
 * that isn't one of EVIDENCE_MIME_TYPES.
 */
export function detectEvidenceType(bytes: Uint8Array): EvidenceMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  if (startsWith(bytes, ascii('%PDF-'))) return 'application/pdf'
  return null
}

/** Strip path parts and control characters from an uploaded file name. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(0, 200)
  return cleaned || 'evidence'
}
