import { auth } from '@/lib/auth'
import { CmtParseError, parseCmtPaperList } from '@/lib/papers/cmt'
import {
  ImportRefusedError,
  applyImport,
  planImport,
} from '@/lib/papers/import'
import { isAdmin } from '@/utils/role'
import { z } from 'astro/zod'
import { type ActionAPIContext, ActionError, defineAction } from 'astro:actions'
import { APIError } from 'better-auth/api'

function requireAdmin(context: ActionAPIContext) {
  if (!context.locals.user) {
    throw new ActionError({ code: 'UNAUTHORIZED', message: 'UNAUTHORIZED' })
  }
  if (!isAdmin(context.locals.user)) {
    throw new ActionError({ code: 'FORBIDDEN', message: 'FORBIDDEN' })
  }
}

// Upload of the CMT paper list export (see src/lib/papers/cmt.ts).
const paperListInput = z.object({ file: z.instanceof(File) })

async function parsePaperList(file: File) {
  try {
    return parseCmtPaperList(await file.text())
  } catch (e) {
    if (e instanceof CmtParseError) {
      throw new ActionError({ code: 'BAD_REQUEST', message: e.message })
    }
    throw e
  }
}

export const server = {
  getGreeting: defineAction({
    input: z.object({ name: z.string() }),
    handler: async (input) => {
      console.log('Received input for getGreeting:', input)
      return `Hello, ${input.name}!`
    },
  }),

  addQueue: defineAction({
    handler: async () => {
      console.log('Adding jobs to the queue...')
      // return await addQueue()
    },
  }),

  /**
   * Set a first password for a signed-in user who has none (e.g. a participant
   * who has only used magic links). better-auth's setPassword is server-only,
   * so it can't be called from authClient. Users who already have a password
   * use authClient.changePassword instead.
   */
  setPassword: defineAction({
    input: z.object({ newPassword: z.string() }),
    handler: async ({ newPassword }, context) => {
      if (!context.locals.user) {
        throw new ActionError({ code: 'UNAUTHORIZED', message: 'UNAUTHORIZED' })
      }
      try {
        // Session comes from the request cookies, so pass the headers through.
        await auth.api.setPassword({
          body: { newPassword },
          headers: context.request.headers,
        })
        return { ok: true }
      } catch (e) {
        if (e instanceof APIError) {
          // Forward better-auth's error code (e.g. PASSWORD_TOO_SHORT,
          // PASSWORD_ALREADY_SET) so the UI can show a localized message.
          const code = (e.body?.code as string | undefined) ?? 'UNKNOWN'
          throw new ActionError({
            code: e.statusCode === 401 ? 'UNAUTHORIZED' : 'BAD_REQUEST',
            message: code,
          })
        }
        console.error('setPassword failed:', e)
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'UNKNOWN',
        })
      }
    },
  }),

  /** Admin: parse a CMT paper list and report what an import would change. */
  previewPaperImport: defineAction({
    accept: 'form',
    input: paperListInput,
    handler: async ({ file }, context) => {
      requireAdmin(context)
      return await planImport(await parsePaperList(file))
    },
  }),

  /** Admin: import a CMT paper list (accepted papers + author accounts). */
  importPapers: defineAction({
    accept: 'form',
    input: paperListInput,
    handler: async ({ file }, context) => {
      requireAdmin(context)
      const parsed = await parsePaperList(file)
      try {
        const summary = await applyImport(parsed)
        console.log(
          `Paper import by ${context.locals.user!.email}: ${summary.accepted} accepted, ` +
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
  }),
}
