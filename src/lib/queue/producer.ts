import { type CreateEmailParams, createEmail } from '@/lib/email/create'
import { JOB_NAMES, QUEUE_NAME, redisConnection } from '@/lib/queue/utils'
import { facebookCronPattern } from '@utils/env'
import { Queue } from 'bullmq'

const queue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
})

export async function addEmailQueue(data: CreateEmailParams) {
  // await assertRedisConnection()

  const emailData = createEmail(data)
  const job = await queue.add(JOB_NAMES.EMAIL, emailData)

  console.log(`Jobs added to the queue: ${job.id}`)

  return {
    queue: queue.name,
    jobIds: [job.id],
  }
}

const FACEBOOK_JOB_OPTS = {
  removeOnComplete: 50,
  removeOnFail: 50,
}

/**
 * Registers (or updates) the repeating Facebook sync and queues one sync right
 * away, so the cache is filled after a deploy instead of at the next cron tick.
 * Safe to call on every worker start: the scheduler is upserted by id.
 */
export async function registerFacebookScheduler() {
  const schedulerId = `${JOB_NAMES.FACEBOOK}-scheduler`
  await queue.upsertJobScheduler(
    schedulerId,
    { pattern: facebookCronPattern },
    {
      name: JOB_NAMES.FACEBOOK,
      data: {},
      opts: FACEBOOK_JOB_OPTS,
    }
  )
  const job = await queue.add(JOB_NAMES.FACEBOOK, {}, FACEBOOK_JOB_OPTS)

  console.log(
    `Facebook scheduler "${schedulerId}" registered with pattern "${facebookCronPattern}". Startup sync job: ${job.id}`
  )
}

async function assertRedisConnection() {
  const client = await queue.client
  const pong = await client.ping()
  if (pong !== 'PONG') {
    throw new Error(`Redis ping failed`)
  }
}
