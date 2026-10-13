"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "id-ID" | "en-US";
const STORAGE_KEY = "forkcast-language";
type LanguageContextValue = { language: AppLanguage; setLanguage: (value: AppLanguage) => void };
const LanguageContext = createContext<LanguageContextValue>({ language: "id-ID", setLanguage: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<AppLanguage>("id-ID");
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    updateLanguage(stored === "id-ID" || stored === "en-US" ? stored : navigator.language.toLowerCase().startsWith("id") ? "id-ID" : "en-US");
  }, []);
  const setLanguage = useCallback((value: AppLanguage) => { updateLanguage(value); localStorage.setItem(STORAGE_KEY, value); }, []);
  useEffect(() => { document.documentElement.lang = language === "id-ID" ? "id" : "en"; document.title = tr(language, "Forkcast — Catat makan, lebih tenang", "Forkcast — Log food with ease"); }, [language]);
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
export const tr = (language: AppLanguage, indonesian: string, english: string) => language === "en-US" ? english : indonesian;
const mealTypeEnglish: Record<string, string> = { Sarapan: "Breakfast", "Makan siang": "Lunch", "Makan malam": "Dinner", Camilan: "Snacks" };
export const mealTypeLabel = (language: AppLanguage, type: string) => language === "id-ID" ? type : mealTypeEnglish[type] ?? type;
