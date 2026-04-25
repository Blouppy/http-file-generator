"use client";

import { createContext, use, useEffect, useState } from "react";
import type { Language, Translations } from "@/lib/translations";
import { translations } from "@/lib/translations";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from "@/services/local-storage.service";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const persistedLanguage = getStorageItem<Language>(STORAGE_KEYS.LANGUAGE, "en");

    setLanguageState(persistedLanguage);
  }, []);

  const setLanguage = (lang: Language) => {
    setStorageItem(STORAGE_KEYS.LANGUAGE, lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = use(LanguageContext);

  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return ctx;
}
