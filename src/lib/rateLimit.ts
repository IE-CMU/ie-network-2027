import { Redis } from 'ioredis'

import { redisConnection } from './queue/utils.js'

// Fixed-window counters in Redis, shared by all server instances.
let redis: Redis | null = null
const client = () => (redis ??= new Redis({ ...redisConnection, lazyConnect: true }))

/**
 * Count one hit for `key`; false once more than `limit` hits happened in the
 * current `windowS`-second window. Fails open (true) if Redis is down, so an
 * outage doesn't lock everyone out of signing in.
 */
export async function hit(key: string, limit: number, windowS: number): Promise<boolean> {
  try {
    const k = `ratelimit:${key}`
    const [[, count]] = (await client().multi().incr(k).expire(k, windowS, 'NX').exec()) as [
      [Error | null, number],
    ]
    return count <= limit
  } catch (e) {
    console.error('Rate limit check failed:', e)
    return true
  }
}

/** Client IP: first X-Forwarded-For entry (set by the reverse proxy), else the socket address. */
export function clientIp(headers: Headers, clientAddress: string | undefined): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown'
}
