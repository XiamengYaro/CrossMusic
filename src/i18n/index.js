import { ref, computed } from 'vue'
import { getItem, setItem } from '@/utils/storage'
import locales from './locales'

const currentLocale = ref(getItem('locale') || 'zh')

export function useI18n() {
  const t = computed(() => (key) => locales[currentLocale.value]?.[key] || locales.zh[key] || key)
  function setLocale(locale) {
    if (locales[locale]) {
      currentLocale.value = locale
      setItem('locale', locale)
    }
  }
  return { t, locale: currentLocale, setLocale, availableLocales: Object.keys(locales) }
}
