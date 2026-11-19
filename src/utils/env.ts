import 'dotenv/config'

function getEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
  const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'")

  if (trimmed.length >= 2 && (hasDoubleQuotes || hasSingleQuotes)) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

// Env groups that only one service needs (web or worker) are exported as
// optional values plus a require*() function. Each service calls the
// require*() functions it needs at startup, so a missing value fails fast
// there without forcing the other service to define it.
// Env needed by both services (DB, Redis) is still checked on import.

//--------------- Server Port (web) ----------------
export const serverPort = getEnv('SERVER_PORT')

export function requireServerPort() {
  if (!serverPort || isNaN(parseInt(serverPort))) {
    throw new Error('Invalid SERVER_PORT env.')
  }
  return parseInt(serverPort)
}

//--------------- Database ----------------
const dbUser = getEnv('POSTGRES_APP_USER')
const dbPassword = getEnv('POSTGRES_APP_PASSWORD')
const dbHost = getEnv('POSTGRES_HOST')
const dbPort = getEnv('POSTGRES_PORT')
const dbName = getEnv('POSTGRES_DB')

// const dbUser = import.meta.env.POSTGRES_APP_USER
// const dbPassword = import.meta.env.POSTGRES_APP_PASSWORD
// const dbHost = import.meta.env.POSTGRES_HOST
// const dbPort = import.meta.env.POSTGRES_PORT
// const dbName = import.meta.env.POSTGRES_DB

if (!dbUser || !dbPassword || !dbHost || !dbPort || !dbName) {
  throw new Error('Invalid DB env.')
}
export const dbConnectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

//--------------- Gmail (worker) ----------------
export const gmailUser = getEnv('GMAIL_USER')
export const gmailAppPassword = getEnv('GMAIL_APP_PASSWORD')

// export const gmailUser = import.meta.env.GMAIL_USER
// export const googleClientId = import.meta.env.GOOGLE_CLIENT_ID
// export const googleClientSecret = import.meta.env.GOOGLE_CLIENT_SECRET
// export const googleRefreshToken = import.meta.env.GOOGLE_REFRESH_TOKEN

// console.log({
//   gmailUser,
//   googleClientId,
//   googleClientSecret,
//   googleRefreshToken,
// })

export function requireGmailEnv() {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Invalid Gmail env.')
  }
  return { gmailUser, gmailAppPassword }
}

//--------------- BetterAuth (web) ----------------
export const betterAuthSecret = getEnv('BETTER_AUTH_SECRET')
export const betterAuthUrl = getEnv('BETTER_AUTH_URL')

// export const betterAuthSecret = import.meta.env.BETTER_AUTH_SECRET
// export const betterAuthUrl = import.meta.env.BETTER_AUTH_URL

// BetterAuth reads these from process.env itself; this only fails fast.
export function requireBetterAuthEnv() {
  if (!betterAuthSecret || !betterAuthUrl) {
    throw new Error('Invalid BetterAuth env.')
  }
  return { betterAuthSecret, betterAuthUrl }
}

// Pre-launch switch. Anything but "true" (including unset) keeps the site
// closed: magic link is off, so only accounts with a password (seeded
// admins/users) can sign in, and no account can be created or imported
// author sign in. Read once at startup; restart to change.
export const allowExternalUser = getEnv('ALLOW_EXTERNAL_USER')?.toLowerCase() === 'true'

//--------------- Redis ----------------

const redisPort = getEnv('REDIS_PORT')
const redisPassword = getEnv('REDIS_PASSWORD')
const redisHost = getEnv('REDIS_HOST')

// console.log({
//   redisPort,
//   redisPassword,
//   redisHost,
// })

if (!redisPort || !redisHost || !redisPassword) {
  throw new Error('Invalid Redis env.')
}

export { redisHost, redisPort, redisPassword }

export const redisConnectionString = `redis://default:${redisPassword}@${redisHost}:${redisPort}`

//--------------- Facebook (worker) ----------------
// Only the worker uses these. They are not required here so the web server can
// start without them; the sync job checks them before calling the Graph API.
export const facebookAccessToken = getEnv('FACEBOOK_ACCESS_TOKEN')
export const facebookPageId = getEnv('FACEBOOK_PAGE_ID')

// BullMQ cron pattern (with a seconds field). Default: every 3 hours, on the hour.
export const facebookCronPattern =
  getEnv('FACEBOOK_CRON_PATTERN') ?? '0 0 */3 * * *'

// Number of latest posts to keep in the database.
const facebookPostLimit = Number(getEnv('FACEBOOK_POST_LIMIT') ?? '10')
if (!Number.isInteger(facebookPostLimit) || facebookPostLimit < 1) {
  throw new Error('Invalid FACEBOOK_POST_LIMIT env.')
}
export { facebookPostLimit }
