import { TypeChangeError } from '@/lib/typeChange/requests'
import { ActionError } from 'astro:actions'

/** Turn a TypeChangeError into an ActionError whose message is the code
 *  (translated in the browser); anything else becomes 'UNKNOWN'. */
export function toActionError(e: unknown, what: string): never {
  if (e instanceof TypeChangeError) {
    const code =
      e.code === 'NOT_FOUND' ? 'NOT_FOUND' : e.code.startsWith('ALREADY_') || e.code === 'NOT_PENDING' ? 'CONFLICT' : 'BAD_REQUEST'
    throw new ActionError({ code, message: e.code })
  }
  console.error(`${what} failed:`, e)
  throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'UNKNOWN' })
}
