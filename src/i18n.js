import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Russian is the default language, so it ships in the main bundle. English is
// fetched only when someone uses it, and the admin Story Builder's strings
// live in i18nStudio.js, loaded with the admin panel. Before this split every
// visitor downloaded both languages plus the admin copy (~370 KB of JSON).
import ruTranslation from './locales/ru/translation.json';

const LANG_KEY = "preferredLanguage";

/** Languages that are not bundled, and how to fetch each one. */
const LOADERS = {
  en: () => import('./locales/en/translation.json'),
};

const storedLang = (() => {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
})();
const initialLang = storedLang ?? "ru";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ruTranslation },
    },
    lng: initialLang,
    // Russian, not English: the fallback must be a language that is always
    // present, or i18next would show raw keys while English is still loading.
    // locales.test.ts keeps both files on the same keys, so in practice the
    // fallback never shows.
    fallbackLng: 'ru',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

/** Fetches a language's strings if they are not loaded yet. */
export async function loadLanguage(lng) {
  const load = LOADERS[lng];
  if (!load || i18n.hasResourceBundle(lng, 'translation')) return;
  const mod = await load();
  i18n.addResourceBundle(lng, 'translation', mod.default ?? mod, true, true);
}

/**
 * Switches language, loading it first. Use this instead of
 * i18n.changeLanguage: switching to a language whose strings are not loaded
 * would render the fallback for a moment and then nothing would redraw.
 */
export async function setLanguage(lng) {
  await loadLanguage(lng);
  await i18n.changeLanguage(lng);
}

/**
 * Settles once the starting language's strings are in. main.tsx waits for it
 * before the first render, so an English visitor never sees a Russian first
 * frame. For Russian it settles at once: those strings are bundled.
 */
export const i18nReady = loadLanguage(initialLang).catch(() => {
  // Offline or a failed chunk: render with the Russian fallback rather than
  // not at all.
});

export default i18n;
