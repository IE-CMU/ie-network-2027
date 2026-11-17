import { getSession } from '@lib/auth'
import { localeList } from '@utils/locale'
import { isAdmin } from '@utils/role'
import { defineMiddleware } from 'astro:middleware'

// Route prefixes are locale-less; '/en/...' variants are matched automatically.
// Any logged-in user (user or admin).
const authRoutes = ['/account', '/participant']
// Logged-in admins only.
const adminRoutes = ['/admin']

const localePrefix = new RegExp(`^/(${localeList.join('|')})(?=/|$)`)

// Segment-aware prefix match: '/admin' matches '/admin' and '/admin/users',
// but not '/administrator'.
const matches = (pathname: string, routes: string[]) => {
  const path = pathname.replace(localePrefix, '') || '/'
  return routes.some((route) => path === route || path.startsWith(`${route}/`))
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url
  context.locals.user = null
  context.locals.session = null

  const needsAdmin = matches(pathname, adminRoutes)
  const needsAuth = needsAdmin || matches(pathname, authRoutes)

  // Single session lookup per request; pages/layouts read it from Astro.locals.
  // getSession() logs and returns null on errors instead of failing the request.
  const isAuthed = await getSession(context.request.headers)

  if (needsAuth && !isAuthed) {
    return context.redirect('/unauthorize')
  }

  if (needsAdmin && !isAdmin(isAuthed?.user)) {
    return context.redirect('/unauthorize')
  }

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session
  }

  return next()
})
