import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { addQueue } from '@/utils/email/queue'
export const server = {
  getGreeting: defineAction({
    input: z.object({ name: z.string() }),
    handler: async (input) => {
      console.log('Received input for getGreeting:', input)
      return `Hello, ${input.name}!`
    },
  }),

  addQueue: defineAction({
    handler: async () => {
      console.log('Adding jobs to the queue...')
      return await addQueue()
    },
  }),
}
