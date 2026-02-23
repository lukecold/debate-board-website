import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = useCallback((key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  // Translate a tag slug (e.g. "pros-cons") → localised label, falling back to the raw value
  const tTag = useCallback((tag) => {
    const key = `tag.${tag.toLowerCase()}`;
    return translations[language]?.[key] || translations['en']?.[key] || tag;
  }, [language]);

  const targetLanguage = language;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tTag, targetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
