import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, magicLink } from 'better-auth/plugins'

import { dbClient } from '../../db/client.js'
import { requireBetterAuthEnv } from '../../utils/env.js'
import { PARTICIPANT_TYPES } from '../../utils/participantType.js'

type SendMagicLink = Parameters<typeof magicLink>[0]['sendMagicLink']

/**
 * Single source of truth for the better-auth config.
 *
 * Side-effect dependencies (e.g. how magic-link emails are delivered) are
 * injected, so this file never imports the Redis queue. That lets one-off
 * scripts like src/db/seed.ts build the exact same auth instance without
 * needing Redis.
 */
export function createAuth({ sendMagicLink }: { sendMagicLink: SendMagicLink }) {
  requireBetterAuthEnv()

  return betterAuth({
    database: drizzleAdapter(dbClient, {
      provider: 'pg',
    }),
    // Accounts are created only by the seed / admins, never by self sign-up.
    // Participants sign in by magic link first (which verifies their email),
    // then may set a password from the account page.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    user: {
      additionalFields: {
        // Set by the CMT paper import; users may edit it (updateUser).
        affiliation: { type: 'string', required: false, input: true },
        // Rate category; admin-only (input: false blocks updateUser).
        participantType: {
          type: [...PARTICIPANT_TYPES],
          required: false,
          defaultValue: 'general',
          input: false,
        },
      },
    },
    plugins: [admin(), magicLink({ sendMagicLink, disableSignUp: true })],
  })
}
