import { Queue } from 'bullmq'
import { redisHost, redisPort, redisPassword } from '@utils/env'

const myQueue = new Queue('foo', {
  connection: {
    host: redisHost,
    port: parseInt(redisPort as string),
    password: redisPassword,
  },
})

async function assertRedisConnection() {
  const client = await myQueue.client
  console.log(`Testing Redis connection to ${redisHost}:${redisPort}...`)
  const pong = await client.ping()
  console.log(`Received response from Redis: ${pong}`)
  if (pong !== 'PONG') {
    throw new Error(`Redis ping failed for ${redisHost}:${redisPort}`)
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
    target: `${redisHost}:${redisPort}`,
  }
}

addQueue().catch((error) => {
  console.error('Error adding jobs to the queue:', error)
})
