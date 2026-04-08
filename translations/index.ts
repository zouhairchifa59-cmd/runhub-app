import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

import cs from './cs';
import en from './en';

const i18n = new I18n({
  en,
  cs,
});

// detect language safely
const locales = Localization.getLocales();
const primaryLocale = locales?.[0];

function resolveLanguageCode() {
  const codeFromLanguage = primaryLocale?.languageCode?.toLowerCase();
  if (codeFromLanguage) return codeFromLanguage;

  const codeFromTag = primaryLocale?.languageTag
    ?.split('-')?.[0]
    ?.toLowerCase();
  if (codeFromTag) return codeFromTag;

  return 'en';
}

const deviceLang = resolveLanguageCode();

// supported languages
export const supportedLanguages = ['en', 'cs'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
function isSupportedLanguage(locale: string): locale is SupportedLanguage {
  return supportedLanguages.includes(locale as SupportedLanguage);
}

// set locale (safe fallback)
i18n.locale = isSupportedLanguage(deviceLang)
  ? deviceLang
  : 'en';
i18n.defaultLocale = 'en';

// fallback system
i18n.enableFallback = true;

export function setAppLocale(locale: string) {
  i18n.locale = isSupportedLanguage(locale)
    ? locale
    : 'en';
}

export default i18n;
