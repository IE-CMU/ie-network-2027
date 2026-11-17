import 'dotenv/config'
import fs from 'fs'

import { dbConn } from '../db/client.js'
import { createAuth } from '../lib/create_auth.js'

// Same config as the app; the seed never sends magic links, so no Redis needed.
const auth = createAuth({
  sendMagicLink: async () => {
    throw new Error('Magic links are not available in the seed script')
  },
})

// seed_accounts.json: [{ email, name, role: 'admin' | 'user', password? }]
// - admin: trusted, created with a password and already verified.
// - user (participant): no password. Their first magic-link sign-in verifies
//   the email; they can set a password later from the account page.
type SeedAccount = {
  email: string
  name: string
  role: 'admin' | 'user'
  password?: string
}

function loadAccounts(path: string): SeedAccount[] {
  const raw = JSON.parse(fs.readFileSync(path, 'utf-8'))
  if (!Array.isArray(raw)) throw new Error(`${path} must contain an array`)

  const problems: string[] = []
  raw.forEach((u, i) => {
    const label = `#${i} (${u?.email ?? 'no email'})`
    if (typeof u?.email !== 'string' || !u.email.includes('@')) problems.push(`${label}: invalid email`)
    if (typeof u?.name !== 'string' || !u.name.trim()) problems.push(`${label}: missing name`)
    if (u?.role !== 'admin' && u?.role !== 'user') problems.push(`${label}: role must be "admin" or "user"`)
    if (u?.role === 'admin' && typeof u?.password !== 'string') problems.push(`${label}: admin needs a password`)
  })
  if (problems.length) throw new Error(`Invalid ${path}:\n  ${problems.join('\n  ')}`)

  return raw
}

const seedAccounts = async () => {
  const users = loadAccounts('seed_accounts.json')
  console.log(`Seeding ${users.length} accounts...`)

  let failed = 0
  for (const u of users) {
    try {
      await auth.api.createUser({
        body: {
          email: u.email,
          name: u.name,
          role: u.role,
          // Omitted password => no credential account (magic-link only).
          password: u.password || undefined,
          // Admins are trusted. Important: an unverified user's first
          // magic-link sign-in deletes their existing password (better-auth's
          // account-takeover protection), so admins must start verified.
          data: { emailVerified: u.role === 'admin' },
        },
      })
      console.log('created', u.role, u.email)
    } catch (e: any) {
      if (e?.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        console.log('exists ', u.role, u.email)
      } else {
        failed++
        console.error('FAILED ', u.role, u.email, e?.body?.message ?? e?.message)
      }
    }
  }

  if (failed) {
    console.error(`${failed} account(s) failed.`)
    process.exitCode = 1
  }
}

seedAccounts()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => dbConn.end())
