import { dbConnectionString } from '@/utils/env.js'
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migration',
  dbCredentials: {
    url: dbConnectionString,
  },
  verbose: true,
  strict: true,
})
