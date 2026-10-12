import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './vi.json'
import en from './en.json'
import ko from './ko.json'

export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

export const DEFAULT_LANGUAGE: Language = 'vi'

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en }, ko: { translation: ko } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
}

export default i18n
