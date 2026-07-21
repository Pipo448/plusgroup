// src/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// ✅ NOUVO — Chak lang nan pwòp fichye pa li (pi fasil pou jere, pa gen yon
// sèl fichye jeyan). Ajoute yon nouvo lang se jis ajoute yon nouvo fichye
// isit la, pa touche rès yo.
import ht from './locales/ht'
import fr from './locales/fr'
import en from './locales/en'
import es from './locales/es'

const resources = {
  ht: { translation: ht },
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('plusgroup-lang') || 'ht',
    fallbackLng: 'ht',
    interpolation: { escapeValue: false },
  })

export default i18n
