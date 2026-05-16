import { addFacebookQueue } from '@/lib/queue/producer'

addFacebookQueue({
  message: 'Hello, Facebook Scheduler!',
})
  .then((result) => {})
  .catch((error) => {
    console.error('Error adding Facebook job to the queue:', error)
  })
