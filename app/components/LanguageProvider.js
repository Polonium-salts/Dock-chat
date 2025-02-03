'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import enMessages from '../../messages/en.json';
import zhCNMessages from '../../messages/zh-CN.json';

const LanguageContext = createContext();

const messages = {
  en: enMessages,
  'zh-CN': zhCNMessages,
};

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { language, translations } = useContext(LanguageContext);
  
  const translate = (key) => {
    if (!key) return '';
    
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (result && typeof result === 'object') {
        result = result[k];
      } else {
        return key;
      }
    }
    
    return result || key;
  };
  
  return translate;
}

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState(messages.en);

  useEffect(() => {
    // Get language from localStorage or settings
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const { language: savedLanguage } = JSON.parse(savedSettings);
      if (savedLanguage) {
        setLanguage(savedLanguage);
        setTranslations(messages[savedLanguage]);
        document.documentElement.lang = savedLanguage;
      }
    }
  }, []);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    setTranslations(messages[newLanguage]);
    document.documentElement.lang = newLanguage;
  };

  return (
    <LanguageContext.Provider value={{ language, translations, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
} 