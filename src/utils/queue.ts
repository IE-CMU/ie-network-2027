import { Queue } from 'bullmq'
import { redisConnection } from '@utils/redis'

const myQueue = new Queue('foo', {
  connection: redisConnection,
})

async function assertRedisConnection() {
  const client = await myQueue.client
  const pong = await client.ping()
  if (pong !== 'PONG') {
    throw new Error(`Redis ping failed`)
  }
}

export async function addQueue() {
  await assertRedisConnection()

  const job1 = await myQueue.add('myJobName', { foo: 'bar' })
  const job2 = await myQueue.add('myJobName', { qux: 'baz' })

  console.log('Jobs added to the queue.')

  return {
    queue: myQueue.name,
    jobIds: [job1.id, job2.id],
  }
}

addQueue().catch((error) => {
  console.error('Error adding jobs to the queue:', error)
})
