import { useEffect, useMemo } from "react";
import { getThemeStyleVars, getGoogleFontLinkUrl } from "@/lib/generate-theme-css";
import { loadGoogleFont } from "@/lib/load-google-font";

/**
 * Extracts and memoizes customization/theme data from a form document.
 * Deduplicates the repeated pattern across landing-editor, editor-app, and preview-mode.
 * Dynamically loads Google Fonts when selected.
 */
export const useFormCustomization = (doc: { customization?: unknown } | null | undefined) => {
  const customization = (doc?.customization ?? null) as Record<string, string> | null;
  const hasCustomization = !!(customization && Object.keys(customization).length > 0);
  // Use a stable primitive dep so the memo doesn't miss when the store emits a new object reference
  const customizationKey = customization ? JSON.stringify(customization) : null;
  const themeVars = useMemo(() => getThemeStyleVars(customization), [customizationKey]);
  const googleFontUrl = useMemo(() => getGoogleFontLinkUrl(customization), [customizationKey]);

  // Dynamically load Google Font in editor/preview contexts
  useEffect(() => {
    if (customization?.font) {
      loadGoogleFont(customization.font);
    }
  }, [customization?.font]);

  return { customization, hasCustomization, themeVars, googleFontUrl };
};
