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

const users = JSON.parse(fs.readFileSync('seed_accounts.json', 'utf-8'))

// console.log('Seeding accounts...', users)

const seedAccounts = async () => {
  for (const u of users) {
    try {
      await auth.api.createUser({
        body: {
          email: u.email,
          password: u.password,
          name: u.name,
          role: u.role as 'admin' | 'user',
        },
      })
      console.log('created', u.email)
    } catch (e: any) {
      console.warn('skip', u.email, e?.body?.message ?? e.message) // e.g. user already exists
    }
  }
}

seedAccounts()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => dbConn.end())
