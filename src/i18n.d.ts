// Types for i18n.js, which stays plain JS.
import type { i18n as I18n } from 'i18next';

declare const i18n: I18n;
export default i18n;

/** Fetches a language's strings if they are not loaded yet. */
export function loadLanguage(lng: string): Promise<void>;

/** Switches language, loading it first. Use instead of i18n.changeLanguage. */
export function setLanguage(lng: string): Promise<void>;

/** Settles once the starting language's strings are loaded. */
export const i18nReady: Promise<void>;
