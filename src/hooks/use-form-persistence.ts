import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY_PREFIX = "betterforms_";
const DEBOUNCE_MS = 500;

export const useFormPersistence = (formId: string, enabled: boolean) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load initial data from localStorage
  const loadSavedData = useCallback((): Record<string, unknown> | null => {
    if (!enabled) return null;
    if (typeof window === "undefined") return null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {}
      return null;
    } catch {
      return null;
    }
  }, [storageKey, enabled]);

  // Save data to localStorage (debounced)
  const saveData = useCallback(
    (data: Record<string, unknown>) => {
      if (!enabled) return;
      if (typeof window === "undefined") return;

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the save
      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          // Storage quota exceeded or unavailable - silently fail
        }
      }, DEBOUNCE_MS);
    },
    [storageKey, enabled],
  );

  // Clear saved data (on successful submission)
  const clearSavedData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silently fail
    }
  }, [storageKey]);

  // Cleanup debounce on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  return { loadSavedData, saveData, clearSavedData };
};
