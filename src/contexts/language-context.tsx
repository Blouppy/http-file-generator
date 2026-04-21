"use client";

import { createContext, useContext, useState } from "react";
import type { Language, Translations } from "@/lib/translations";
import { translations } from "@/lib/translations";
import {
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from "@/services/local-storage.service";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    getStorageItem<Language>(STORAGE_KEYS.LANGUAGE, "en")
  );

  const setLanguage = (lang: Language) => {
    setStorageItem(STORAGE_KEYS.LANGUAGE, lang);
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: translations[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
