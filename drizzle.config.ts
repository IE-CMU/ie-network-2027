import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { connectionString } from '@/utils/env.js'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migration',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
})
