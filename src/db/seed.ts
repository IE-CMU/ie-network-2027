import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import 'dotenv/config'
import fs from 'fs'

import { dbClient, dbConn } from '../db/client.js'
import { requireBetterAuthEnv } from '../utils/env.js'

requireBetterAuthEnv()

const auth = betterAuth({
  database: drizzleAdapter(dbClient, {
    provider: 'pg', // or "mysql", "sqlite"
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
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
