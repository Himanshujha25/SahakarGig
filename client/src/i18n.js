import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translateText } from './lib/aiTranslate';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mai from './locales/mai.json';
import mr from './locales/mr.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

const saved = localStorage.getItem('sg_lang') || 'en';

const missingKeyPending = new Set();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mai: { translation: mai },
    mr: { translation: mr },
    bn: { translation: bn },
    ta: { translation: ta },
    te: { translation: te },
    kn: { translation: kn },
    gu: { translation: gu },
    pa: { translation: pa },
  },
  lng: saved,
  fallbackLng: 'en',
  saveMissing: true,
  missingKeyHandler: (lngs, ns, key, fallbackValue) => {
    const targetLng = Array.isArray(lngs) ? lngs[0] : lngs;
    if (!targetLng || targetLng === 'en') return;
    const reqKey = `${targetLng}:${key}`;
    if (missingKeyPending.has(reqKey)) return;
    missingKeyPending.add(reqKey);

    const textToTranslate = fallbackValue && fallbackValue !== key ? fallbackValue : key;
    translateText(textToTranslate, targetLng)
      .then((translated) => {
        if (translated && translated !== textToTranslate) {
          i18n.addResource(targetLng, ns || 'translation', key, translated);
          i18n.emit('resourceAdded', { lng: targetLng, ns: ns || 'translation', key });
        }
      })
      .catch(() => {})
      .finally(() => {
        missingKeyPending.delete(reqKey);
      });
  },
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = saved;

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('sg_lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
