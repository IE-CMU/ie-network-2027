import { getTypeChangeEvidence } from '@lib/typeChange/requests'
import { isAdmin } from '@utils/role'
import type { APIRoute } from 'astro'

export const prerender = false

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Serves the evidence file (ID card) of a type change request.
// Personal data: only the requester and admins may see it, and it must
// never be cached by browsers or proxies.
export const GET: APIRoute = async ({ params, locals }) => {
  const viewer = locals.user // set by src/middleware.ts on every request
  if (!viewer) return new Response('Unauthorized', { status: 401 })

  const id = params.id
  if (!id || !UUID_RE.test(id)) return new Response('Not found', { status: 404 })

  const file = await getTypeChangeEvidence(id)
  // Same 404 for "missing" and "not yours", so ids can't be probed.
  if (!file || (file.requesterId !== viewer.id && !isAdmin(viewer))) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      // Detected from the bytes at upload, so it is always one of the
      // allowed image/PDF types.
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
