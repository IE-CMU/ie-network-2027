export type Locale = 'en' | 'th'
export const DEFAULT_LOCALE = 'th' as const

export function getLocale(Astro: any): Locale {
  const locale = Astro?.currentLocale ?? DEFAULT_LOCALE
  if (locale !== 'en' && locale !== 'th') {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  return locale as Locale
}
