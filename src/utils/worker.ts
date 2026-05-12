import { Worker, Job } from 'bullmq'
import { redisConnection } from '@utils/redis'

const processJob = async (job: Job) => {
  console.log(`Processing job ${job.id} with data:`, job.data)
  // Optionally report some progress
  //   await job.updateProgress(42)
  // Optionally sending an object as progress
  //   await job.updateProgress({ foo: 'bar' })
  // Do something with job
  return 'some value'
}

const worker = new Worker('foo', processJob, { connection: redisConnection })

worker.on('active', (job) => {
  console.log(
    `Job ${job.id} is now active; previous status was ${job.prev?.status}`
  )
})

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed with error:`, error.message)
})

worker.on('error', (error) => {
  console.error('Worker encountered an error:', error)
})

worker.on('ready', () => {
  console.log('Worker is ready and listening for jobs on queue "foo"')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down worker gracefully...')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down worker gracefully...')
  await worker.close()
  process.exit(0)
})

export default worker
