import { accountExists, savePendingSignup } from '@/lib/auth/pendingSignup'
import { clientIp, hit } from '@/lib/rateLimit'
import { allowExternalUser } from '@/utils/env'
import { USER_AFFILIATION_MAX } from '@/utils/userProfile'
import { z } from 'astro/zod'
import { ActionError, defineAction } from 'astro:actions'

// Per IP, like checkEmail.
const LIMIT = 20
const WINDOW_S = 10 * 60

/**
 * Public: the first half of a participant sign-up. Saves the affiliation
 * for an email that has no account yet; the browser then requests the
 * magic link with the name (which better-auth keeps in the link). When the
 * link is clicked, the account is created with both (src/lib/auth/create.ts).
 *
 * Returns { exists: true } and saves nothing if the account already
 * exists (e.g. created in the meantime): the browser just sends the link.
 */
export const startSignup = defineAction({
  input: z.object({
    email: z.string().trim().email(),
    affiliation: z.string().trim().min(1).max(USER_AFFILIATION_MAX),
  }),
  handler: async ({ email, affiliation }, context) => {
    // Magic link is off before launch (ALLOW_EXTERNAL_USER); nothing to check or start.
    if (!allowExternalUser) throw new ActionError({ code: 'FORBIDDEN', message: 'SIGNUP_CLOSED' })
    const ip = clientIp(context.request.headers, context.clientAddress)
    if (!(await hit(`start-signup:${ip}`, LIMIT, WINDOW_S))) {
      throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: 'TOO_MANY_REQUESTS' })
    }
    if (await accountExists(email)) return { exists: true }
    await savePendingSignup(email, affiliation)
    return { exists: false }
  },
})
