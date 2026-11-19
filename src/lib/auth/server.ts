import { createAuth } from './create.js'
import { getPendingAffiliation } from './pendingSignup.js'
import { addEmailQueue } from '../queue/producer.js'

export const auth = createAuth({
  // Sent for unknown emails too: clicking the link creates a 'participant'
  // account (magic-link sign-up, see create.ts). For a sign-up, the email
  // shows the details the account will get, so someone who did not ask for
  // it (e.g. a stranger typed their email) can tell and ignore it.
  sendMagicLink: async ({ email, url }, ctx) => {
    const affiliation = await getPendingAffiliation(email)
    const name = typeof ctx?.body?.name === 'string' ? ctx.body.name.trim() : ''
    const message = affiliation
      ? [
          `Click the link to create your account and sign in: ${url}`,
          '',
          'The account will be created with these details, which cannot be changed later:',
          `Name: ${name || '-'}`,
          `Affiliation: ${affiliation}`,
          '',
          'If you did not request this, you can ignore this email.',
        ].join('\n')
      : `Click the link to sign in: ${url}`
    await addEmailQueue({
      // Greet by email: the typed name is not verified yet.
      name: email,
      recipientEmail: email,
      message,
      subject: affiliation ? 'Create your IE Network 2027 account' : 'Your Magic Link',
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
