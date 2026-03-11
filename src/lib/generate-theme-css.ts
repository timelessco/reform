import type { CSSProperties } from "react";
import {
  BASE_COLORS,
  DARK_BASE_COLORS,
  THEME_COLORS,
  RADIUS_MAP,
  SPACING_MAP,
  FONT_MAP,
  STYLES,
  DESTRUCTIVE_TOKENS,
} from "./theme-presets";

/**
 * Layout fields that map to --bf-* layout CSS variables.
 * These apply to both editor (layout only) and preview/public (full theme).
 */
const LAYOUT_FIELDS: Record<string, string> = {
  pageWidth: "--bf-page-width",
  coverHeight: "--bf-cover-height",
  logoWidth: "--bf-logo-width",
  logoHeight: "--bf-logo-height",
  inputWidth: "--bf-input-width",
  baseFontSize: "--bf-font-size",
  letterSpacing: "--bf-letter-spacing",
};

/** Migrates legacy "vw" page-width values to "%" (same numeric range 30-100). */
function migratePageWidth(value: string): string {
  return value.endsWith("vw") ? value.replace(/vw$/, "%") : value;
}

/**
 * All shadcn token names that can be overridden via --bf-* prefix.
 */
export const TOKEN_NAMES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
] as const;

/**
 * Resolves the full set of design tokens from a customization record.
 *
 * Resolution cascade:
 * 1. Read preset name (default: "default")
 * 2. Get base tokens from BASE_COLORS
 * 3. Get theme tokens from THEME_COLORS
 * 4. Derive secondary = muted, destructive = constant
 * 5. Apply font + radius
 * 6. Apply any individual token overrides (advanced Pro keys)
 */
function resolveTokens(customization: Record<string, string>): Record<string, string> {
  const presetName = customization.preset || "vega";
  const style = STYLES[presetName] ?? STYLES.vega;

  const baseColorName = customization.baseColor || style.baseColor;
  const themeColorName = customization.themeColor || style.themeColor;
  const fontName = customization.font || style.font;
  const radiusName = customization.radius || style.radius;
  const spacingName = customization.spacing || style.spacing;

  const isDark = customization.mode === "dark";
  const baseColors = isDark ? DARK_BASE_COLORS : BASE_COLORS;
  const base = baseColors[baseColorName] ?? baseColors.zinc;
  const theme = THEME_COLORS[themeColorName] ?? THEME_COLORS.zinc;

  // Build merged token map
  const tokens: Record<string, string> = {
    // Base color tokens
    ...base,
    // Theme (accent) color tokens
    ...theme,
    // Derived: secondary = base's muted
    secondary: base.muted,
    "secondary-foreground": base["muted-foreground"],
    // Constant destructive tokens
    ...DESTRUCTIVE_TOKENS,
  };

  // Font
  const fontValue = FONT_MAP[fontName] ?? FONT_MAP.Inter;
  tokens.font = fontValue;

  // Radius
  const radiusValue = RADIUS_MAP[radiusName] ?? RADIUS_MAP.medium;
  tokens.radius = radiusValue;

  // Spacing
  const spacingValue = SPACING_MAP[spacingName] ?? SPACING_MAP.normal;
  tokens.spacing = spacingValue;

  // Apply any individual token overrides from advanced Pro users
  // Priority: mode-prefixed key (e.g. "light:primary") > unprefixed legacy key
  const mode = isDark ? "dark" : "light";
  for (const tokenName of TOKEN_NAMES) {
    const prefixedKey = `${mode}:${tokenName}`;
    if (customization[prefixedKey]) {
      tokens[tokenName] = customization[prefixedKey];
    } else if (customization[tokenName]) {
      tokens[tokenName] = customization[tokenName];
    }
  }

  return tokens;
}

/**
 * Builds --bf-* CSS variable entries from resolved tokens + layout fields.
 */
function buildThemeVarEntries(customization: Record<string, string>): [string, string][] {
  const tokens = resolveTokens(customization);
  const entries: [string, string][] = [];

  // Token vars: both --bf-* (for external CSS consumers) and standard names (direct override)
  for (const tokenName of TOKEN_NAMES) {
    if (tokens[tokenName]) {
      entries.push([`--bf-${tokenName}`, tokens[tokenName]]);
      entries.push([`--${tokenName}`, tokens[tokenName]]);
    }
  }

  // Font + radius + spacing
  if (tokens.font) entries.push(["--bf-font", tokens.font]);
  if (tokens.radius) entries.push(["--bf-radius", tokens.radius]);
  if (tokens.spacing) entries.push(["--bf-spacing", tokens.spacing]);

  // Layout vars
  for (const [field, cssVar] of Object.entries(LAYOUT_FIELDS)) {
    if (customization[field]) {
      const val =
        field === "pageWidth" ? migratePageWidth(customization[field]) : customization[field];
      entries.push([cssVar, val]);
    }
  }

  return entries;
}

/**
 * Returns a React style object with CSS custom properties for the full theme.
 * Apply to a `.bf-themed` container; the bridge rules in styles.css map
 * --bf-* to standard shadcn vars within scope.
 */
export function getThemeStyleVars(
  customization: Record<string, string> | null | undefined,
): CSSProperties {
  if (!customization || Object.keys(customization).length === 0) return {};

  const vars: Record<string, string> = {};
  for (const [prop, value] of buildThemeVarEntries(customization)) {
    vars[prop] = value;
  }
  return vars as CSSProperties;
}

/**
 * Returns a React style object with ONLY layout --bf-* vars.
 * Used in the editor canvas so it gets correct dimensions
 * without overriding color tokens (which would conflict with editor chrome).
 */
export function getLayoutOnlyVars(
  customization: Record<string, string> | null | undefined,
): CSSProperties {
  if (!customization || Object.keys(customization).length === 0) return {};

  const vars: Record<string, string> = {};
  for (const [field, cssVar] of Object.entries(LAYOUT_FIELDS)) {
    if (customization[field]) {
      vars[cssVar] =
        field === "pageWidth" ? migratePageWidth(customization[field]) : customization[field];
    }
  }
  return vars as CSSProperties;
}

/**
 * Generates a `<style>` body that sets CSS custom properties on `.bf-themed`.
 * Used for public form SSR injection. The property-consuming bridge rules
 * live in styles.css and are loaded with the page.
 */
export function generateThemeCss(customization: Record<string, string> | null | undefined): string {
  if (!customization || Object.keys(customization).length === 0) return "";

  const entries = buildThemeVarEntries(customization);
  if (entries.length === 0) return "";

  const varLines = entries.map(([prop, val]) => `  ${prop}: ${val};`).join("\n");

  let css = `.bf-themed {\n${varLines}\n}`;

  const customCss = customization.customCss?.trim();
  if (customCss) {
    css += `\n/* Custom CSS */\n${customCss}\n`;
  }

  return css;
}
