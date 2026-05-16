import { type CreateEmailParams, createEmail } from '@/lib/email/create'
import { JOB_NAMES, QUEUE_NAME, redisConnection } from '@/lib/queue/utils'
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

interface FacebookJobData {
  message: string
}
export async function addFacebookQueue(data: FacebookJobData) {
  // await assertRedisConnection()

  const schedulerId = `${JOB_NAMES.FACEBOOK}-scheduler`
  const job = await queue.upsertJobScheduler(
    schedulerId,
    {
      pattern: '* */15 * * * *', // Every 15 minutes
    },
    {
      name: JOB_NAMES.FACEBOOK,
      data: data,
    }
  )

  console.log(`Jobs added to the queue: ${job.id}`)

  return {
    queue: queue.name,
    jobIds: [job.id],
  }
}

async function assertRedisConnection() {
  const client = await queue.client
  const pong = await client.ping()
  if (pong !== 'PONG') {
    throw new Error(`Redis ping failed`)
  }
}
