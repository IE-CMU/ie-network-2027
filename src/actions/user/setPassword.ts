import { auth } from '@/lib/auth'
import { z } from 'astro/zod'
import { ActionError, defineAction } from 'astro:actions'
import { APIError } from 'better-auth/api'
import { requireUser } from '../_guards'

/**
 * Set a first password for a signed-in user who has none (e.g. a participant
 * who has only used magic links). better-auth's setPassword is server-only,
 * so it can't be called from authClient. Users who already have a password
 * use authClient.changePassword instead.
 */
export const setPassword = defineAction({
  input: z.object({ newPassword: z.string() }),
  handler: async ({ newPassword }, context) => {
    requireUser(context)
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
})
