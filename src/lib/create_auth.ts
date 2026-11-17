import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, magicLink } from 'better-auth/plugins'

import { dbClient } from '../db/client.js'
import { requireBetterAuthEnv } from '../utils/env.js'

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
    emailAndPassword: {
      enabled: true,
    },
    plugins: [admin(), magicLink({ sendMagicLink })],
  })
}
