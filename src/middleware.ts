import { getSession } from '@lib/auth'
import { defineMiddleware } from 'astro:middleware'

const protectedRoutes = ['/account', '/en/account']

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  context.locals.user = null
  context.locals.session = null

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Single session lookup per request; pages/layouts read it from Astro.locals.
  // getSession() logs and returns null on errors instead of failing the request.
  const isAuthed = await getSession(context.request.headers)

  if (isProtected && !isAuthed) {
    return context.redirect('/unauthorize')
  }

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session
  }

  return next()
})
