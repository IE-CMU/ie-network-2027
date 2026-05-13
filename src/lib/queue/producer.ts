import { JOB_NAMES, QUEUE_NAME, redisConnection } from '@/lib/queue/utils'
import { Queue } from 'bullmq'

const queue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
})

interface EmailJobData {
  to: string
  subject: string
  body: string
}
export async function addEmailQueue(data: EmailJobData) {
  await assertRedisConnection()

  const job = await queue.add(JOB_NAMES.EMAIL, data)

  console.log(`Jobs added to the queue: ${job.id}`)

  return {
    queue: queue.name,
    jobIds: [job.id],
  }
}

interface FacebookJobData {
  userId: string
  message: string
}
export async function addFacebookQueue(data: FacebookJobData) {
  await assertRedisConnection()

  const job = await queue.add(JOB_NAMES.FACEBOOK, data)

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
