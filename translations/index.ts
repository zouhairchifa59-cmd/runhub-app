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
const deviceLang = locales?.[0]?.languageCode || 'en';

// supported languages
const supportedLanguages = ['en', 'cs'];

// set locale (safe fallback)
i18n.locale = supportedLanguages.includes(deviceLang)
  ? deviceLang
  : 'en';

// fallback system
i18n.enableFallback = true;

export default i18n;