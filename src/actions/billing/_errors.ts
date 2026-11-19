import { BillingError } from '@/lib/billing/addresses'
import { ActionError } from 'astro:actions'

/** Turn a BillingError into an ActionError whose message is the code
 *  (translated in the browser); anything else becomes 'UNKNOWN'.
 *  INVALID carries the field (`INVALID:<field>`), LOCKED the reasons
 *  (`LOCKED:<reason>,...`, see lockedMessage in src/utils/billingAddress.ts). */
export function toActionError(e: unknown, what: string): never {
  if (e instanceof BillingError) {
    const code =
      e.code === 'NOT_FOUND' ? 'NOT_FOUND' : e.code === 'INVALID' ? 'BAD_REQUEST' : 'CONFLICT'
    const message =
      e.code === 'INVALID' && typeof e.detail === 'string'
        ? `INVALID:${e.detail}`
        : e.code === 'LOCKED' && Array.isArray(e.detail)
          ? `LOCKED:${e.detail.join(',')}`
          : e.code
    throw new ActionError({ code, message })
  }
  console.error(`${what} failed:`, e)
  throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'UNKNOWN' })
}
