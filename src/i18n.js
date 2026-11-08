import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import ruTranslation from './locales/ru/translation.json';

// The admin Story Builder has its own namespace, "studio", one JSON file per
// area (locales/<lang>/studio/<area>.json → t("<area>.<key>")). Kept out of
// translation.json so admin copy never tangles with the app's. A new area is
// one import per language plus one entry in STUDIO_AREAS below.
import enStudio_common from './locales/en/studio/common.json';
import enStudio_shell from './locales/en/studio/shell.json';
import enStudio_newSet from './locales/en/studio/newSet.json';
import enStudio_settings from './locales/en/studio/settings.json';
import enStudio_audio from './locales/en/studio/audio.json';
import enStudio_content from './locales/en/studio/content.json';
import enStudio_practice from './locales/en/studio/practice.json';
import enStudio_admin from './locales/en/studio/admin.json';
import enStudio_players from './locales/en/studio/players.json';
import enStudio_feedback from './locales/en/studio/feedback.json';
import enStudio_audit from './locales/en/studio/audit.json';
import ruStudio_common from './locales/ru/studio/common.json';
import ruStudio_shell from './locales/ru/studio/shell.json';
import ruStudio_newSet from './locales/ru/studio/newSet.json';
import ruStudio_settings from './locales/ru/studio/settings.json';
import ruStudio_audio from './locales/ru/studio/audio.json';
import ruStudio_content from './locales/ru/studio/content.json';
import ruStudio_practice from './locales/ru/studio/practice.json';
import ruStudio_admin from './locales/ru/studio/admin.json';
import ruStudio_players from './locales/ru/studio/players.json';
import ruStudio_feedback from './locales/ru/studio/feedback.json';
import ruStudio_audit from './locales/ru/studio/audit.json';

const STUDIO_AREAS = {
  en: { common: enStudio_common, shell: enStudio_shell, newSet: enStudio_newSet, settings: enStudio_settings, audio: enStudio_audio, content: enStudio_content, practice: enStudio_practice, admin: enStudio_admin, players: enStudio_players, feedback: enStudio_feedback, audit: enStudio_audit },
  ru: { common: ruStudio_common, shell: ruStudio_shell, newSet: ruStudio_newSet, settings: ruStudio_settings, audio: ruStudio_audio, content: ruStudio_content, practice: ruStudio_practice, admin: ruStudio_admin, players: ruStudio_players, feedback: ruStudio_feedback, audit: ruStudio_audit },
};

const LANG_KEY = "preferredLanguage";

const initialLang = localStorage.getItem(LANG_KEY) ?? "ru";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
        studio: STUDIO_AREAS.en
      },
      ru: {
        translation: ruTranslation,
        studio: STUDIO_AREAS.ru
      }
    },
    lng: initialLang,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;