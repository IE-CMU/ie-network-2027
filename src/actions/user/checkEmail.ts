import { dbClient } from '@/db/client'
import { user } from '@/db/schema'
import { clientIp, hit } from '@/lib/rateLimit'
import { z } from 'astro/zod'
import { ActionError, defineAction } from 'astro:actions'
import { eq, sql } from 'drizzle-orm'

// Per IP. Generous for real people (typos, retries), slow for enumeration.
const LIMIT = 20
const WINDOW_S = 10 * 60

/**
 * Public: does an account exist for this email? The login form asks before
 * sending a magic link, so an unknown email (not an imported paper author)
 * can be warned that it will become a 'participant' account.
 *
 * This deliberately tells anyone whether an email has an account; the rate
 * limit keeps that from being used to check many emails.
 */
export const checkEmail = defineAction({
  input: z.object({ email: z.string().trim().email() }),
  handler: async ({ email }, context) => {
    const ip = clientIp(context.request.headers, context.clientAddress)
    if (!(await hit(`check-email:${ip}`, LIMIT, WINDOW_S))) {
      throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: 'TOO_MANY_REQUESTS' })
    }
    const [row] = await dbClient
      .select({ id: user.id })
      .from(user)
      .where(eq(sql`lower(${user.email})`, email.toLowerCase()))
      .limit(1)
    return { exists: !!row }
  },
})
