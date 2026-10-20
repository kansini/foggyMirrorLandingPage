import type { Locale } from './content'

export function screenshotUrl(locale: Locale, index: number) {
  return '/images/screenshots/' + (locale === 'zh' ? 'cn' : 'en') + '/' + String(index + 1).padStart(2, '0') + '.webp'
}
