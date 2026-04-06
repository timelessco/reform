export const CUSTOMIZATION_AUTO_DEFAULTS = {
  pageWidth: "700px",
  coverHeight: "200px",
  logoWidth: "100px",
  inputWidth: "none",
  baseFontSize: "1rem",
  letterSpacing: "0.01em",
  titleFontSize: "clamp(2.25rem, 6vw, 48px)",
  titleLetterSpacing: "-0.03em",
} as const;

export type AutoCustomizationField = keyof typeof CUSTOMIZATION_AUTO_DEFAULTS;

export const AUTO_CUSTOMIZATION_FIELDS = Object.keys(
  CUSTOMIZATION_AUTO_DEFAULTS,
) as AutoCustomizationField[];
