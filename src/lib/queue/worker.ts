import { JOB_NAMES, QUEUE_NAME, redisConnection } from '@/lib/queue/utils'
import { sendEmail } from '@lib/email/sent'
import { Job, Worker } from 'bullmq'

async function processJob(job: Job) {
  if (job.name === JOB_NAMES.EMAIL) {
    await processEmailJob(job)
  } else if (job.name === JOB_NAMES.FACEBOOK) {
    await processFacebookJob(job)
  } else {
    console.warn(`Unknown job type: ${job.name}. Skipping job ${job.id}.`)
  }

  // await job.updateProgress(42)
  // await job.updateProgress({ foo: 'bar' })
  // return 'result'
}

async function processEmailJob(job: Job) {
  console.log(`Processing email job ${job.id} with data:`, job.data)
  await sendEmail(job.data)
}

async function processFacebookJob(job: Job) {
  console.log(`Processing Facebook job ${job.id} with data:`, job.data)
}

const worker = new Worker(QUEUE_NAME, processJob, {
  connection: redisConnection,
  concurrency: 2,
  useWorkerThreads: false,
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
  console.log(
    `Worker is ready and listening for jobs on queue "${QUEUE_NAME}".`
  )
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
