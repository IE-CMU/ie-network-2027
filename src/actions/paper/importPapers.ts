import { ImportRefusedError, applyImport } from '@/lib/paper/import'
import { ActionError, defineAction } from 'astro:actions'
import { requireAdmin } from '../_guards'
import { paperListInput, parsePaperList } from './_cmtUpload'

/** Admin: import a CMT paper list (accepted papers + author accounts). */
export const importPapers = defineAction({
  accept: 'form',
  input: paperListInput,
  handler: async ({ file }, context) => {
    const admin = requireAdmin(context)
    const parsed = await parsePaperList(file)
    try {
      const summary = await applyImport(parsed)
      console.log(
        `Paper import by ${admin.email}: ${summary.accepted} accepted, ` +
          `${summary.newPapers.length} new, ${summary.updatedPapers.length} updated, ` +
          `${summary.deactivatedPapers.length} deactivated, ${summary.newUsers.length} new users`
      )
      return summary
    } catch (e) {
      if (e instanceof ImportRefusedError) {
        throw new ActionError({ code: 'BAD_REQUEST', message: e.message })
      }
      console.error('Paper import failed:', e)
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: (e as Error)?.message ?? 'Import failed',
      })
    }
  },
})
