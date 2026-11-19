// Sign-up details (affiliation) waiting for a new user's magic link.
// See `pending_signup` in src/db/schema.ts.
import { and, eq, gt, lt, sql } from 'drizzle-orm'

import { dbClient } from '../../db/client.js'
import { pendingSignup, user } from '../../db/schema.js'
import { MAGIC_LINK_EXPIRES_S } from '../../utils/userProfile.js'

const key = (email: string) => email.trim().toLowerCase()

export async function accountExists(email: string): Promise<boolean> {
  const [row] = await dbClient
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, key(email)))
    .limit(1)
  return !!row
}

/** Save (or replace) the affiliation for an email that has no account yet. */
export async function savePendingSignup(email: string, affiliation: string) {
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRES_S * 1000)
  // Housekeeping: nothing reads expired rows, so drop them here.
  await dbClient.delete(pendingSignup).where(lt(pendingSignup.expiresAt, new Date()))
  await dbClient
    .insert(pendingSignup)
    .values({ email: key(email), affiliation, expiresAt })
    .onConflictDoUpdate({
      target: pendingSignup.email,
      set: { affiliation, expiresAt, createdAt: new Date() },
    })
}

/** The waiting affiliation for this email, if it has not expired. */
export async function getPendingAffiliation(email: string): Promise<string | null> {
  const [row] = await dbClient
    .select({ affiliation: pendingSignup.affiliation })
    .from(pendingSignup)
    .where(and(eq(pendingSignup.email, key(email)), gt(pendingSignup.expiresAt, new Date())))
  return row?.affiliation ?? null
}

export async function deletePendingSignup(email: string) {
  await dbClient.delete(pendingSignup).where(eq(pendingSignup.email, key(email)))
}
