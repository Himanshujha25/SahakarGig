import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from './api';

const memoryCache = new Map();

function getStoredCache() {
  try {
    const raw = localStorage.getItem('sg_ai_cache');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredCache(key, val) {
  try {
    const cache = getStoredCache();
    cache[key] = val;
    localStorage.setItem('sg_ai_cache', JSON.stringify(cache));
  } catch {}
}

/**
 * Dynamically translate user content (job descriptions, categories, chat messages)
 * into target language using AI smart fallback caching.
 */
export async function translateText(text, targetLang = 'en') {
  if (!text || typeof text !== 'string' || !text.trim() || targetLang === 'en') {
    return text;
  }

  const cacheKey = `${targetLang}:${text.trim()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const stored = getStoredCache();
  if (stored[cacheKey]) {
    memoryCache.set(cacheKey, stored[cacheKey]);
    return stored[cacheKey];
  }

  try {
    // 1. Attempt backend AI translation route
    const { data } = await api.post('/ai/translate', { text, targetLang });
    if (data && data.translatedText && data.translatedText.trim()) {
      const res = data.translatedText.trim();
      memoryCache.set(cacheKey, res);
      setStoredCache(cacheKey, res);
      return res;
    }
  } catch (e) {
    // Fallback to client-side MyMemory free API if backend endpoint is unavailable
    try {
      const langCode = targetLang === 'mai' ? 'hi' : targetLang;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
      const res = await fetch(url);
      const json = await res.json();
      const translated = json?.responseData?.translatedText;
      if (translated && typeof translated === 'string') {
        memoryCache.set(cacheKey, translated);
        setStoredCache(cacheKey, translated);
        return translated;
      }
    } catch {}
  }

  return text;
}

/**
 * React Hook for AI dynamic translation of dynamic strings
 */
export function useAITranslate(text) {
  const { i18n } = useTranslation();
  const targetLang = i18n.language || 'en';
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;
    if (!text || targetLang === 'en') {
      setTranslated(text);
      return;
    }

    const cacheKey = `${targetLang}:${text.trim()}`;
    const stored = getStoredCache();
    if (memoryCache.has(cacheKey)) {
      setTranslated(memoryCache.get(cacheKey));
      return;
    } else if (stored[cacheKey]) {
      setTranslated(stored[cacheKey]);
      return;
    }

    translateText(text, targetLang).then((res) => {
      if (isMounted) setTranslated(res);
    });

    return () => { isMounted = false; };
  }, [text, targetLang]);

  return translated;
}

export function clearTranslationCache() {
  memoryCache.clear();
  try {
    localStorage.removeItem('sg_ai_cache');
  } catch {}
}

