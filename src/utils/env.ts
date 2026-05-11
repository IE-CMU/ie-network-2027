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
export const connectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

//--------------- Gmail ----------------
export const gmailUser = getEnv('GMAIL_USER')
export const googleClientId = getEnv('GOOGLE_CLIENT_ID')
export const googleClientSecret = getEnv('GOOGLE_CLIENT_SECRET')
export const googleRefreshToken = getEnv('GOOGLE_REFRESH_TOKEN')

// export const gmailUser = import.meta.env.GMAIL_USER
// export const googleClientId = import.meta.env.GOOGLE_CLIENT_ID
// export const googleClientSecret = import.meta.env.GOOGLE_CLIENT_SECRET
// export const googleRefreshToken = import.meta.env.GOOGLE_REFRESH_TOKEN

console.log({
  gmailUser,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
})

if (
  !gmailUser ||
  !googleClientId ||
  !googleClientSecret ||
  !googleRefreshToken
) {
  throw new Error('Invalid Gmail env.')
}

//--------------- BetterAuth ----------------
export const betterAuthSecret = getEnv('BETTER_AUTH_SECRET')
export const betterAuthUrl = getEnv('BETTER_AUTH_URL')

// export const betterAuthSecret = import.meta.env.BETTER_AUTH_SECRET
// export const betterAuthUrl = import.meta.env.BETTER_AUTH_URL

if (!betterAuthSecret || !betterAuthUrl) {
  throw new Error('Invalid BetterAuth env.')
}
