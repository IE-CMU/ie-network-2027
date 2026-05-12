import { Worker, Job } from 'bullmq'
import { redisConnection } from '@/utils/email/redis'

const processJob = async (job: Job) => {
  console.log(`Processing job ${job.id} with data:`, job.data)
  await job.updateProgress(42)
  await job.updateProgress({ foo: 'bar' })
  return 'some value'
}

const worker = new Worker('email', processJob, {
  connection: redisConnection,
  concurrency: 1,
  useWorkerThreads: true,
})

worker.on('active', (job) => {
  console.log(`Job ${job.id} is now active.`)
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
  console.log('Worker is ready and listening for jobs on queue "email".')
})

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress:`, progress)
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
