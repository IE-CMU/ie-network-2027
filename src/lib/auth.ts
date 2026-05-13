import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'

import { dbClient } from '../db/client.js'
import { addEmailQueue } from './queue/producer.js'

export const auth = betterAuth({
  database: drizzleAdapter(dbClient, {
    provider: 'pg', // or "mysql", "sqlite"
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        // Implement your email sending logic here using the token
        await addEmailQueue({
          name: email,
          recipientEmail: email,
          message: `Click the link to sign in: ${url}`,
          subject: 'Your Magic Link',
        })
      },
    }),
  ],
})
