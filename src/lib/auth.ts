import { createAuth } from './create_auth.js'
import { addEmailQueue } from './queue/producer.js'

export const auth = createAuth({
  sendMagicLink: async ({ email, url }) => {
    await addEmailQueue({
      name: email,
      recipientEmail: email,
      message: `Click the link to sign in: ${url}`,
      subject: 'Your Magic Link',
    })
  },
})

// Session type definition
// Do no use this type in client code, use the one from auth-client.ts instead
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
