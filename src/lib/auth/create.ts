import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, magicLink } from 'better-auth/plugins'

import { dbClient } from '../../db/client.js'
import { allowExternalUser, requireBetterAuthEnv } from '../../utils/env.js'
import { PARTICIPANT_TYPES } from '../../utils/participantType.js'
import { MAGIC_LINK_EXPIRES_S, USER_NAME_MAX } from '../../utils/userProfile.js'
import { deletePendingSignup, getPendingAffiliation } from './pendingSignup.js'

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
    // Name and affiliation are set once, at account creation, and never
    // changed by users (src/utils/userProfile.ts). /update-user is the only
    // endpoint that could change them; nothing in the app uses it.
    // ALLOW_EXTERNAL_USER off (pre-launch): no magic-link sign-in or
    // sign-up at all, including links already sent.
    disabledPaths: [
      '/update-user',
      ...(allowExternalUser ? [] : ['/sign-in/magic-link', '/magic-link/verify']),
    ],
    databaseHooks: {
      user: {
        create: {
          // Magic-link sign-ups: the name comes from the link (typed on the
          // sign-up form, but not trusted: trimmed and capped here), the
          // affiliation from pending_signup. Imports/seeds pass both, so
          // nothing is looked up for them.
          before: async (u) => {
            const name =
              (u.name ?? '').trim().slice(0, USER_NAME_MAX) || u.email.split('@')[0]
            const affiliation =
              (u as { affiliation?: string | null }).affiliation ||
              (await getPendingAffiliation(u.email))
            return { data: { ...u, name, affiliation } }
          },
          after: async (u) => {
            await deletePendingSignup(u.email)
          },
        },
      },
    },
    user: {
      additionalFields: {
        // From CMT (paper import) or the sign-up form; not user-editable.
        // Server-side createUser calls (import, seed) still set it.
        affiliation: { type: 'string', required: false, input: false },
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
    plugins: [admin(), magicLink({ sendMagicLink, expiresIn: MAGIC_LINK_EXPIRES_S })],
  })
}
