import { createContext, useCallback, useContext, useMemo } from "react";
import {
  getTranslations,
  languageToCode,
  type TranslationKey,
} from "@/lib/translations";

interface TranslationContextValue {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: string; // language code (en/es/fr)
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
  /** Language name ("English") or code ("en") */
  language: string;
  children: React.ReactNode;
}

export function TranslationProvider({
  language,
  children,
}: TranslationProviderProps) {
  const translations = useMemo(() => getTranslations(language), [language]);
  const code = useMemo(
    () =>
      language.length <= 3 ? language : languageToCode(language),
    [language],
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      let str = translations[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [translations],
  );

  const value = useMemo(() => ({ t, language: code }), [t, code]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    // Fallback to English if no provider
    return {
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        const translations = getTranslations("en");
        let str = translations[key] ?? key;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            str = str.replaceAll(`{${k}}`, String(v));
          }
        }
        return str;
      },
      language: "en",
    };
  }
  return ctx;
}
