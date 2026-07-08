import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supportedLanguagePreferences, translations } from './translations.js';

const LANGUAGE_STORAGE_KEY = 'cornerstone-language';

function getInitialLanguagePreference() {
  if (typeof window === 'undefined') return 'system';

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return supportedLanguagePreferences.includes(storedLanguage) ? storedLanguage : 'system';
  } catch {
    return 'system';
  }
}

function getSystemLanguage() {
  if (typeof window === 'undefined') return 'en';

  const preferredLanguage =
    window.navigator.languages?.[0] || window.navigator.language || window.navigator.userLanguage || '';

  return preferredLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function getTranslationValue(language, key) {
  return key.split('.').reduce((current, part) => current?.[part], translations[language]);
}

function applyTemplate(value, replacements) {
  if (typeof value !== 'string' || !replacements) return value;

  return Object.entries(replacements).reduce(
    (current, [key, replacement]) => current.replaceAll(`{{${key}}}`, String(replacement)),
    value,
  );
}

function updateMeta(selector, content) {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute('content', content);
  }
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [languagePreference, setLanguagePreference] = useState(getInitialLanguagePreference);
  const [systemLanguage, setSystemLanguage] = useState(getSystemLanguage);
  const language = languagePreference === 'system' ? systemLanguage : languagePreference;

  const t = useCallback(
    (key, replacements) => {
      const value = getTranslationValue(language, key) ?? getTranslationValue('en', key) ?? key;
      return applyTemplate(value, replacements);
    },
    [language],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languagePreference);
    } catch {
      // Storage can be unavailable in restricted browser modes; keep the in-memory choice.
    }
  }, [languagePreference]);

  useEffect(() => {
    const handleLanguageChange = () => setSystemLanguage(getSystemLanguage());

    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('meta.title');
    updateMeta('meta[name="description"]', t('meta.description'));
    updateMeta('meta[property="og:title"]', t('meta.title'));
    updateMeta('meta[property="og:description"]', t('meta.description'));
    updateMeta('meta[name="twitter:title"]', t('meta.title'));
    updateMeta('meta[name="twitter:description"]', t('meta.description'));
  }, [language, t]);

  const contextValue = useMemo(
    () => ({
      language,
      languagePreference,
      setLanguagePreference,
      t,
    }),
    [language, languagePreference, t],
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }

  return context;
}
