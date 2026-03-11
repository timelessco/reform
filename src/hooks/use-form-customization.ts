import { useMemo } from "react";
import { getThemeStyleVars } from "@/lib/generate-theme-css";

/**
 * Extracts and memoizes customization/theme data from a form document.
 * Deduplicates the repeated pattern across landing-editor, editor-app, and preview-mode.
 */
export function useFormCustomization(doc: { customization?: unknown } | null | undefined) {
  const customization = (doc?.customization ?? null) as Record<string, string> | null;
  const hasCustomization = !!(customization && Object.keys(customization).length > 0);
  // Use a stable primitive dep so the memo doesn't miss when the store emits a new object reference
  const customizationKey = customization ? JSON.stringify(customization) : null;
  const themeVars = useMemo(() => getThemeStyleVars(customization), [customizationKey]);
  return { customization, hasCustomization, themeVars };
}
