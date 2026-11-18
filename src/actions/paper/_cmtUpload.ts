import { CmtParseError, parseCmtPaperList } from '@/lib/paper/cmt'
import { z } from 'astro/zod'
import { ActionError } from 'astro:actions'

// Upload of the CMT paper list export (see src/lib/paper/cmt.ts).
export const paperListInput = z.object({ file: z.instanceof(File) })

export async function parsePaperList(file: File) {
  try {
    return parseCmtPaperList(await file.text())
  } catch (e) {
    if (e instanceof CmtParseError) {
      throw new ActionError({ code: 'BAD_REQUEST', message: e.message })
    }
    throw e
  }
}
