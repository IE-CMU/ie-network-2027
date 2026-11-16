import { auth } from '@lib/auth'
import { defineMiddleware } from 'astro:middleware'

const protectedRoutes = ['/account']

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  context.locals.user = null
  context.locals.session = null

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  })

  if (isProtected && !isAuthed) {
    return context.redirect('/unauthorize')
  }

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session
  }

  return next()
})
