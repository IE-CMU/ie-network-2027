import { dbClient } from '@db/client'
import { facebookPost } from '@db/schema'
import type { Locale } from '@utils/locale'
import { desc, sql } from 'drizzle-orm'

export const FACEBOOK_PAGE_URL =
  'https://www.facebook.com/profile.php?id=61589437013925'

export interface FacebookPostCard {
  id: string
  dateTime: string // ISO, for <time datetime>
  dateLabel: string // Already formatted for the locale
  message: string | null
  permalinkUrl: string
  imageUrl: string | null
}

/** Cached Facebook posts, newest first, ready to pass to the UI as props. */
export async function getFacebookPosts(
  locale: Locale
): Promise<FacebookPostCard[]> {
  // The image bytes are not selected; they are served by /api/facebook/image.
  const rows = await dbClient
    .select({
      id: facebookPost.id,
      createdTime: facebookPost.createdTime,
      message: facebookPost.message,
      permalinkUrl: facebookPost.permalinkUrl,
      imageKey: facebookPost.imageKey,
      hasImage: sql<boolean>`${facebookPost.image} is not null`,
    })
    .from(facebookPost)
    .orderBy(desc(facebookPost.createdTime))

  // Format on the server with a fixed time zone so the hydrated component
  // shows exactly the same text. Thai uses the Buddhist year (e.g. 2569).
  const dateFormat = new Intl.DateTimeFormat(
    locale === 'th' ? 'th-TH' : 'en-US',
    { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }
  )

  return rows.map((row) => ({
    id: row.id,
    dateTime: row.createdTime.toISOString(),
    dateLabel: dateFormat.format(row.createdTime),
    message: row.message,
    permalinkUrl: row.permalinkUrl,
    // The image key in the URL changes whenever the picture changes, so the
    // image route can be cached forever.
    imageUrl: row.hasImage
      ? `/api/facebook/image/${encodeURIComponent(row.id)}?v=${encodeURIComponent(row.imageKey ?? '')}`
      : null,
  }))
}
