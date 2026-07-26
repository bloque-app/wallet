import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export const LANGUAGE_STORAGE_KEY = 'wallet-language';

export type SupportedLanguage = 'es' | 'en';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['es', 'en'];

function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'es' || stored === 'en' ? stored : null;
}

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: getStoredLanguage() ?? 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

export function setLanguage(language: SupportedLanguage) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
  i18next.changeLanguage(language);
}

export default i18next;
