import { isAdmin } from '@/utils/role'
import { type ActionAPIContext, ActionError } from 'astro:actions'

export function requireUser(context: ActionAPIContext) {
  if (!context.locals.user) {
    throw new ActionError({ code: 'UNAUTHORIZED', message: 'UNAUTHORIZED' })
  }
  return context.locals.user
}

export function requireAdmin(context: ActionAPIContext) {
  const user = requireUser(context)
  if (!isAdmin(user)) {
    throw new ActionError({ code: 'FORBIDDEN', message: 'FORBIDDEN' })
  }
  return user
}
