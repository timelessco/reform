import { useEffect, useMemo } from "react";
import { getThemeStyleVars, getGoogleFontLinkUrl } from "@/lib/theme/generate-theme-css";
import { loadGoogleFont } from "@/lib/theme/load-google-font";

/**
 * Extracts and memoizes customization/theme data from a form document.
 * Deduplicates the repeated pattern across landing-editor, editor-app, and preview-mode.
 * Dynamically loads Google Fonts when selected.
 */
export const useFormCustomization = (
  doc: { customization?: unknown } | null | undefined,
  themeMode?: string,
) => {
  const rawCustomization = (doc?.customization ?? null) as Record<string, string> | null;
  // Always inject the user's app theme mode so the theme resolver picks the
  // correct (light/dark) base-color palette — even for forms that carry no
  // per-form customization. Without this, a form with `customization: null`
  // or `{}` renders light-mode input backgrounds over a dark app shell,
  // making inputs nearly invisible.
  const customization = themeMode ? { ...rawCustomization, mode: themeMode } : rawCustomization;
  const hasCustomization = !!(rawCustomization && Object.keys(rawCustomization).length > 0);
  // Use a stable primitive dep so the memo doesn't miss when the store emits a new object reference
  const customizationKey = customization ? JSON.stringify(customization) : null;
  // eslint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps -- customizationKey is a stable serialized form of customization
  const themeVars = useMemo(() => getThemeStyleVars(customization), [customizationKey]);
  // eslint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps -- customizationKey is a stable serialized form of customization
  const googleFontUrl = useMemo(() => getGoogleFontLinkUrl(customization), [customizationKey]);

  // Dynamically load Google Fonts in editor/preview contexts
  useEffect(() => {
    if (customization?.font) {
      loadGoogleFont(customization.font);
    }
    if (customization?.titleFont) {
      loadGoogleFont(customization.titleFont);
    }
  }, [customization?.font, customization?.titleFont]);

  return { customization, hasCustomization, themeVars, googleFontUrl };
};
