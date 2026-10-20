import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { content, type Locale, type Theme } from '../content'

const localeKey = 'foggy-mirror-language'
const themeKey = 'foggy-mirror-theme'

function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

function save(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* Keep working when storage is unavailable. */ }
}

export function usePreferences() {
  const locale = ref<Locale>(document.documentElement.lang === 'en' ? 'en' : 'zh')
  const theme = ref<Theme>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const copy = computed(() => content[locale.value])
  let manualTheme = read(themeKey) === 'dark' || read(themeKey) === 'light'
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')

  watch(locale, value => {
    document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en'
    document.title = content[value].title
    document.querySelector('meta[name="description"]')?.setAttribute('content', content[value].description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', content[value].title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', content[value].description)
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', value === 'zh' ? 'zh_CN' : 'en_US')
  }, { immediate: true })

  watch(theme, value => {
    document.documentElement.dataset.theme = value
    document.documentElement.style.colorScheme = value
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#111c20' : '#edf1e9')
  }, { immediate: true })

  function setLocale(value: Locale) {
    locale.value = value
    save(localeKey, value)
  }

  function toggleTheme() {
    manualTheme = true
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    save(themeKey, theme.value)
  }

  function followSystem(event: MediaQueryListEvent) {
    if (!manualTheme) theme.value = event.matches ? 'dark' : 'light'
  }

  onMounted(() => systemTheme.addEventListener('change', followSystem))
  onBeforeUnmount(() => systemTheme.removeEventListener('change', followSystem))
  return { locale, theme, copy, setLocale, toggleTheme }
}
