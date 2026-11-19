import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.js'
import postgres from 'postgres'
import { dbConnectionString } from '../utils/env.js'

export const dbConn = postgres(dbConnectionString)

export const dbClient = drizzle(dbConn, { schema: schema, logger: false })

/** The database client or a transaction from it, for helpers that run in either. */
export type Db = typeof dbClient | Parameters<Parameters<typeof dbClient.transaction>[0]>[0]
