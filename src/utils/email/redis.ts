import { redisHost, redisPort, redisPassword } from '@utils/env'

export const redisConnection = {
  host: redisHost,
  port: parseInt(redisPort as string),
  password: redisPassword,
  maxRetriesPerRequest: null, // Required for BullMQ
}
