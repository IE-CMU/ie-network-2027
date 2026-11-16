import { dbConn } from '@db/client'
import { facebookPost } from '@db/schema'
import {
  facebookAccessToken,
  facebookPageId,
  facebookPostLimit,
} from '@utils/env'
import { inArray, notInArray, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'

const GRAPH_API_VERSION = 'v25.0'
const GRAPH_FIELDS =
  'id,created_time,message,permalink_url,full_picture,attachments'
const REQUEST_TIMEOUT_MS = 15_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// Separate client without the query logger: the shared one logs parameters,
// which would dump every image's bytes into the worker log.
const db = drizzle(dbConn)

interface GraphPost {
  id: string
  created_time: string
  message?: string
  permalink_url: string
  full_picture?: string
  attachments?: {
    data?: { target?: { id?: string } }[]
  }
}

interface GraphError {
  message: string
  type?: string
  code?: number
}

export interface FacebookSyncResult {
  fetched: number
  imagesDownloaded: number
  imageFailures: number
  deleted: number
}

export async function syncFacebookPosts(): Promise<FacebookSyncResult> {
  if (!facebookAccessToken || !facebookPageId) {
    throw new Error(
      'FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID must be set to sync Facebook posts.'
    )
  }

  const posts = await fetchLatestPosts(
    facebookPageId,
    facebookAccessToken,
    facebookPostLimit
  )

  // An empty feed is far more likely to be an API hiccup than a page with no
  // posts, so keep the cache as it is.
  if (posts.length === 0) {
    console.warn('Facebook returned no posts; keeping the existing cache.')
    return { fetched: 0, imagesDownloaded: 0, imageFailures: 0, deleted: 0 }
  }

  const ids = posts.map((post) => post.id)
  const existingRows = await db
    .select({
      id: facebookPost.id,
      imageKey: facebookPost.imageKey,
      hasImage: sql<boolean>`${facebookPost.image} is not null`,
    })
    .from(facebookPost)
    .where(inArray(facebookPost.id, ids))
  const existing = new Map(existingRows.map((row) => [row.id, row]))

  let imagesDownloaded = 0
  let imageFailures = 0
  const fetchedAt = new Date()

  const rows: {
    post: GraphPost
    imageKey: string | null
    image: { data: Buffer; mime: string } | null
  }[] = []
  for (const post of posts) {
    const imageKey = getImageKey(post)
    const previous = existing.get(post.id)
    const needsDownload =
      !!post.full_picture &&
      !!imageKey &&
      (!previous || previous.imageKey !== imageKey || !previous.hasImage)

    let image: { data: Buffer; mime: string } | null = null
    if (needsDownload) {
      try {
        image = await downloadImage(post.full_picture!)
        imagesDownloaded++
      } catch (error) {
        // Keep whatever image we had; the next run will try again.
        imageFailures++
        console.error(
          `Failed to download image for Facebook post ${post.id}:`,
          (error as Error).message
        )
      }
    }

    rows.push({ post, imageKey, image })
  }

  const deleted = await db.transaction(async (tx) => {
    for (const { post, imageKey, image } of rows) {
      const base = {
        createdTime: new Date(post.created_time),
        message: post.message ?? null,
        permalinkUrl: post.permalink_url,
        fetchedAt,
      }
      // Image columns change only when a new image was downloaded or the post
      // no longer has a picture. Otherwise (unchanged, or the download failed)
      // the stored image is left as it is.
      const imageColumns = image
        ? { imageKey, image: image.data, imageMime: image.mime }
        : imageKey
          ? {}
          : { imageKey: null, image: null, imageMime: null }

      await tx
        .insert(facebookPost)
        .values({ id: post.id, ...base, ...imageColumns })
        .onConflictDoUpdate({
          target: facebookPost.id,
          set: { ...base, ...imageColumns },
        })
    }

    // Keep only the posts in the latest batch.
    const removed = await tx
      .delete(facebookPost)
      .where(notInArray(facebookPost.id, ids))
      .returning({ id: facebookPost.id })
    return removed.length
  })

  return { fetched: posts.length, imagesDownloaded, imageFailures, deleted }
}

async function fetchLatestPosts(
  pageId: string,
  accessToken: string,
  limit: number
): Promise<GraphPost[]> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`
  )
  // The URL contains the token: never log it.
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', GRAPH_FIELDS)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const body = (await res.json().catch(() => null)) as {
    data?: GraphPost[]
    error?: GraphError
  } | null

  if (!res.ok || !body || body.error) {
    const error = body?.error
    if (error?.code === 190) {
      throw new Error(
        `Facebook access token is invalid or expired (code 190): ${error.message}. Generate a new long-lived page access token and update FACEBOOK_ACCESS_TOKEN.`
      )
    }
    throw new Error(
      `Facebook Graph API request failed (HTTP ${res.status}${error?.code ? `, code ${error.code}` : ''}): ${error?.message ?? 'unexpected response'}`
    )
  }

  return body.data ?? []
}

// The picture URL changes on every request, so it can't tell us whether the
// image is new. The attachment target id is stable; fall back to the URL path
// (the file name part), which also stays the same across requests.
function getImageKey(post: GraphPost): string | null {
  if (!post.full_picture) return null
  const targetId = post.attachments?.data?.[0]?.target?.id
  if (targetId) return targetId
  try {
    return new URL(post.full_picture).pathname
  } catch {
    return null
  }
}

async function downloadImage(
  url: string
): Promise<{ data: Buffer; mime: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const mime = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
  if (!mime.startsWith('image/')) {
    throw new Error(`unexpected content type "${mime}"`)
  }

  const data = Buffer.from(await res.arrayBuffer())
  if (data.length > MAX_IMAGE_BYTES) {
    throw new Error(`image too large (${data.length} bytes)`)
  }
  return { data, mime }
}
