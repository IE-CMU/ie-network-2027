import { eq } from 'drizzle-orm'

import { dbClient } from '../../db/client.js'
import { user } from '../../db/schema.js'
import { createAuth } from './create.js'
import { addEmailQueue } from '../queue/producer.js'

export const auth = createAuth({
  sendMagicLink: async ({ email, url }) => {
    // Sign-up is disabled, so a link for an unknown email could never be used.
    // Skip sending it, so the site can't be used to email arbitrary addresses.
    // The UI shows the same message either way, so this doesn't reveal which
    // emails are registered.
    const existing = await dbClient
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1)
    if (existing.length === 0) {
      console.warn('Magic link requested for unknown email; not sent.')
      return
    }

    await addEmailQueue({
      name: email,
      recipientEmail: email,
      message: `Click the link to sign in: ${url}`,
      subject: 'Your Magic Link',
    })
  },
})

// Session type definition
// Do no use this type in client code, use the one from auth/client.ts instead
export type Session = typeof auth.$Infer.Session

// Function to get session with error handling
export async function getSession(headers: Headers): Promise<Session | null> {
  let session: Session | null = null
  try {
    const response = await auth.api.getSession({
      headers: headers,
    })
    session = response ?? null
    // console.log('Session:', session)
  } catch (error) {
    console.error('Error fetching session:', error)
  }
  return session
}
