import { sendEmail } from '@/lib/email/create.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
// your drizzle instance
import { magicLink } from 'better-auth/plugins'

import { dbClient } from '../db/client.js'

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
        console.log(`Send magic link to ${email} with token: ${token}`)
        // You can use your existing email sending function here
        await sendEmail({
          name: email,
          recipientEmail: email,
          message: `Click the link to sign in: ${url}`,
        })
      },
    }),
  ],
})
