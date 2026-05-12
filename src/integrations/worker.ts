import type { AstroIntegration } from 'astro'

export default function workerIntegration(): AstroIntegration {
  return {
    name: 'worker-init',
    hooks: {
      'astro:server:setup': async () => {
        // Import worker to start processing jobs
        await import('@/utils/email/worker')
        console.log('✓ BullMQ worker initialized')
      },
      'astro:build:done': async () => {
        // Import worker for production builds
        await import('@/utils/email/worker')
        console.log('✓ BullMQ worker initialized for production')
      },
    },
  }
}
