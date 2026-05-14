import { getRelativeLocaleUrlList } from 'astro:i18n'

// Make sure that this order is the same as the order of locales in astro.config.mjs
export const localeList = ['th', 'en'] as const

// Make sure that this default locale is the same as the defaultLocale in astro.config.mjs
export const defaultLocale = 'th' as const

export type Locale = (typeof localeList)[number]

export function getLocale(Astro: any): Locale {
  const locale = Astro?.currentLocale ?? defaultLocale
  if (!localeList.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  return locale as Locale
}

export function getUrlListCustom(pathname: string) {
  // Remove the locale prefix from the pathname to get the relative path.
  const normalizedPathname =
    pathname.replace(new RegExp(`^/(${localeList.join('|')})(?=/|$)`), '') ||
    '/'
  // Get the list of URLs for each locale based on the relative path.
  const urlList = getRelativeLocaleUrlList(normalizedPathname)
  // Create an object that maps each locale to its corresponding URL.
  const urlObj = {} as Record<Locale, string>
  urlList.forEach((item, idx) => {
    urlObj[localeList[idx]] = item
  })
  return urlObj
}
