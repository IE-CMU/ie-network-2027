import { auth } from '@/lib/auth'
import { ActionError, defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { APIError } from 'better-auth/api'

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
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'UNKNOWN' })
      }
    },
  }),
}
