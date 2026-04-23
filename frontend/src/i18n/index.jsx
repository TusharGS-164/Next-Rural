// frontend/src/i18n/index.js
/**
 * Lightweight i18n system — no external library needed.
 *
 * Usage anywhere in the app:
 *   const { t, lang, setLang } = useLanguage()
 *   t('nav.home')           → "Home" | "ಮುಖಪುಟ" | "होम" | "హోమ్"
 *   t('home.stats.youth')   → nested key lookup
 *
 * Language persisted to localStorage so it survives page refresh.
 * Setting lang also saves the user's profile language preference.
 */

import {
  createContext, useContext, useState,
  useCallback, useEffect,
} from 'react'

import en from './en.json'
import kn from './kn.json'
import hi from './hi.json'
import te from './te.json'

export const TRANSLATIONS = { en, kn, hi, te }

export const LANGUAGES = [
  { value: 'en', label: 'English',  nativeLabel: 'English'  },
  { value: 'kn', label: 'Kannada',  nativeLabel: 'ಕನ್ನಡ'    },
  { value: 'hi', label: 'Hindi',    nativeLabel: 'हिन्दी'    },
  { value: 'te', label: 'Telugu',   nativeLabel: 'తెలుగు'   },
]

const STORAGE_KEY = 'ryp_ui_language'

// ── Translation lookup ────────────────────────────────────────
/**
 * Get a value from a nested object using a dot-separated key.
 * t('nav.home') → translations.nav.home
 * Falls back to English, then to the raw key if not found.
 */
export function lookup(translations, key) {
  const parts  = key.split('.')
  let   result = translations
  for (const part of parts) {
    if (result == null || typeof result !== 'object') return null
    result = result[part]
  }
  return typeof result === 'string' ? result : null
}

export function translate(lang, key, fallback = key) {
  const dict     = TRANSLATIONS[lang] || en
  const value    = lookup(dict, key)
  if (value !== null) return value
  // Fall back to English
  const enValue  = lookup(en, key)
  return enValue !== null ? enValue : fallback
}

// ── Context ───────────────────────────────────────────────────
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return TRANSLATIONS[stored] ? stored : 'en'
  })

  // Sync <html lang=""> attribute for accessibility + browser features
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir  = 'ltr'  // all 4 languages are LTR
  }, [lang])

  const setLang = useCallback((newLang) => {
    if (!TRANSLATIONS[newLang]) return
    localStorage.setItem(STORAGE_KEY, newLang)
    setLangState(newLang)
  }, [])

  const t = useCallback(
    (key, fallback) => translate(lang, key, fallback),
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
