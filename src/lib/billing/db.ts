import { dbClient } from '../../db/client.js'

/** The database client or a transaction from it. */
export type Db = typeof dbClient | Parameters<Parameters<typeof dbClient.transaction>[0]>[0]
