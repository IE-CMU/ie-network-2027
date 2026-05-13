import { redisHost, redisPassword, redisPort } from '@utils/env'

export const redisConnection = {
  host: redisHost,
  port: parseInt(redisPort as string),
  password: redisPassword,
  maxRetriesPerRequest: null, // Required for BullMQ
}

export const QUEUE_NAME = 'queue'

export const JOB_NAMES = {
  EMAIL: 'email',
  FACEBOOK: 'facebook',
} as const
