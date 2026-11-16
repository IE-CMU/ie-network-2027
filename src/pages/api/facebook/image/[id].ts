import { dbClient } from '@db/client'
import { facebookPost } from '@db/schema'
import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'

// Serves a cached Facebook post image, e.g. /api/facebook/image/<post id>?v=<image key>
export const GET: APIRoute = async ({ params }) => {
  const id = params.id
  if (!id) {
    return new Response('Post id is required', { status: 400 })
  }

  const [row] = await dbClient
    .select({ image: facebookPost.image, imageMime: facebookPost.imageMime })
    .from(facebookPost)
    .where(eq(facebookPost.id, id))

  if (!row?.image) {
    return new Response('Image not found', { status: 404 })
  }

  return new Response(new Uint8Array(row.image), {
    headers: {
      'Content-Type': row.imageMime ?? 'image/jpeg',
      // Safe to cache forever: the URL carries the image key (?v=), which
      // changes whenever the picture changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
