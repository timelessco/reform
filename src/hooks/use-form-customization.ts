import { useMemo } from "react";
import { getThemeStyleVars } from "@/lib/generate-theme-css";

/**
 * Extracts and memoizes customization/theme data from a form document.
 * Deduplicates the repeated pattern across landing-editor, editor-app, and preview-mode.
 */
export function useFormCustomization(doc: { customization?: unknown } | null | undefined) {
  const customization = (doc?.customization ?? null) as Record<string, string> | null;
  const hasCustomization = !!(customization && Object.keys(customization).length > 0);
  const themeVars = useMemo(() => getThemeStyleVars(customization), [customization]);
  return { customization, hasCustomization, themeVars };
}
