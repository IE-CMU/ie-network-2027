import { Queue } from 'bullmq'
import { redisHost, redisPort, redisPassword } from '@utils/env'

const myQueue = new Queue('foo', {
  connection: {
    host: redisHost,
    port: parseInt(redisPort as string),
    password: redisPassword,
  },
})

async function addJobs() {
  await myQueue.add('myJobName', { foo: 'bar' })
  await myQueue.add('myJobName', { qux: 'baz' })
}

addJobs().then(() => myQueue.close())
