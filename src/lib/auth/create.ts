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
    // Accounts come from the seed, the CMT paper import (participantType
    // 'author') or magic-link self sign-up (default 'participant'). There is
    // no password sign-up: everyone signs in by magic link first (which
    // verifies their email), then may set a password from the account page.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    databaseHooks: {
      user: {
        create: {
          // Magic-link sign-ups arrive without a name: use the part of the
          // email before the @. The user can change it later.
          before: async (u) => {
            if (u.name?.trim()) return
            return { data: { ...u, name: u.email.split('@')[0] } }
          },
        },
      },
    },
    user: {
      additionalFields: {
        // Set by the CMT paper import; users may edit it (updateUser).
        affiliation: { type: 'string', required: false, input: true },
        // Rate category; not user-editable (input: false blocks updateUser).
        participantType: {
          type: [...PARTICIPANT_TYPES],
          required: false,
          defaultValue: 'participant',
          input: false,
        },
      },
    },
    // Sign-up allowed: an unknown email gets a 'participant' account when the
    // link is clicked. The login form warns first (see checkEmail action).
    plugins: [admin(), magicLink({ sendMagicLink })],
  })
}
