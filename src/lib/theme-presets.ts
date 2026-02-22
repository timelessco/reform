/**
 * Theme preset definitions for form customization.
 * Base colors use OKLCH from official shadcn v4 to preserve undertone differences.
 */

// ============================================================================
// Base Colors — 5 gray scale variants (OKLCH from shadcn v4)
// ============================================================================

export interface BaseColorTokens {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  border: string;
  input: string;
}

export const BASE_COLORS: Record<string, BaseColorTokens> = {
  zinc: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.141 0.005 285.823)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.141 0.005 285.823)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.141 0.005 285.823)",
    muted: "oklch(0.967 0.001 286.375)",
    "muted-foreground": "oklch(0.552 0.016 285.938)",
    accent: "oklch(0.967 0.001 286.375)",
    "accent-foreground": "oklch(0.21 0.006 285.885)",
    border: "oklch(0.92 0.004 286.32)",
    input: "oklch(0.92 0.004 286.32)",
  },
  slate: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.129 0.042 264.695)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.129 0.042 264.695)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.129 0.042 264.695)",
    muted: "oklch(0.968 0.007 247.896)",
    "muted-foreground": "oklch(0.554 0.046 257.417)",
    accent: "oklch(0.968 0.007 247.896)",
    "accent-foreground": "oklch(0.208 0.042 265.755)",
    border: "oklch(0.929 0.013 255.508)",
    input: "oklch(0.929 0.013 255.508)",
  },
  stone: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.147 0.004 49.25)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.147 0.004 49.25)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.147 0.004 49.25)",
    muted: "oklch(0.97 0.001 106.424)",
    "muted-foreground": "oklch(0.553 0.013 58.071)",
    accent: "oklch(0.97 0.001 106.424)",
    "accent-foreground": "oklch(0.216 0.006 56.043)",
    border: "oklch(0.923 0.003 48.717)",
    input: "oklch(0.923 0.003 48.717)",
  },
  gray: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.13 0.028 261.692)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.13 0.028 261.692)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.13 0.028 261.692)",
    muted: "oklch(0.967 0.003 264.542)",
    "muted-foreground": "oklch(0.551 0.027 264.364)",
    accent: "oklch(0.967 0.003 264.542)",
    "accent-foreground": "oklch(0.21 0.034 264.665)",
    border: "oklch(0.928 0.006 264.531)",
    input: "oklch(0.928 0.006 264.531)",
  },
  neutral: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
  },
};

// ============================================================================
// Dark Base Colors — same 5 gray scale variants for dark mode (OKLCH from shadcn v4)
// ============================================================================

export const DARK_BASE_COLORS: Record<string, BaseColorTokens> = {
  zinc: {
    background: "oklch(0.141 0.005 285.823)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.21 0.006 285.885)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.21 0.006 285.885)",
    "popover-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.274 0.006 286.033)",
    "muted-foreground": "oklch(0.705 0.015 286.067)",
    accent: "oklch(0.274 0.006 286.033)",
    "accent-foreground": "oklch(0.985 0 0)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
  },
  slate: {
    background: "oklch(0.129 0.042 264.695)",
    foreground: "oklch(0.984 0.003 247.858)",
    card: "oklch(0.208 0.042 265.755)",
    "card-foreground": "oklch(0.984 0.003 247.858)",
    popover: "oklch(0.208 0.042 265.755)",
    "popover-foreground": "oklch(0.984 0.003 247.858)",
    muted: "oklch(0.279 0.041 260.031)",
    "muted-foreground": "oklch(0.704 0.04 256.788)",
    accent: "oklch(0.279 0.041 260.031)",
    "accent-foreground": "oklch(0.984 0.003 247.858)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
  },
  stone: {
    background: "oklch(0.147 0.004 49.25)",
    foreground: "oklch(0.985 0.001 106.423)",
    card: "oklch(0.216 0.006 56.043)",
    "card-foreground": "oklch(0.985 0.001 106.423)",
    popover: "oklch(0.216 0.006 56.043)",
    "popover-foreground": "oklch(0.985 0.001 106.423)",
    muted: "oklch(0.268 0.007 34.298)",
    "muted-foreground": "oklch(0.709 0.01 56.259)",
    accent: "oklch(0.268 0.007 34.298)",
    "accent-foreground": "oklch(0.985 0.001 106.423)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
  },
  gray: {
    background: "oklch(0.13 0.028 261.692)",
    foreground: "oklch(0.985 0.002 247.839)",
    card: "oklch(0.21 0.034 264.665)",
    "card-foreground": "oklch(0.985 0.002 247.839)",
    popover: "oklch(0.21 0.034 264.665)",
    "popover-foreground": "oklch(0.985 0.002 247.839)",
    muted: "oklch(0.278 0.033 256.848)",
    "muted-foreground": "oklch(0.707 0.022 261.325)",
    accent: "oklch(0.278 0.033 256.848)",
    "accent-foreground": "oklch(0.985 0.002 247.839)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
  },
  neutral: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
  },
};

// ============================================================================
// Theme Colors — 12 accent hues
// ============================================================================

export interface ThemeColorTokens {
  primary: string;
  "primary-foreground": string;
  ring: string;
}

export const THEME_COLORS: Record<string, ThemeColorTokens> = {
  zinc: { primary: "#18181b", "primary-foreground": "#fafafa", ring: "#18181b" },
  rose: { primary: "#e11d48", "primary-foreground": "#fff1f2", ring: "#e11d48" },
  blue: { primary: "#2563eb", "primary-foreground": "#eff6ff", ring: "#2563eb" },
  green: { primary: "#16a34a", "primary-foreground": "#f0fdf4", ring: "#16a34a" },
  amber: { primary: "#d97706", "primary-foreground": "#fffbeb", ring: "#d97706" },
  orange: { primary: "#ea580c", "primary-foreground": "#fff7ed", ring: "#ea580c" },
  violet: { primary: "#7c3aed", "primary-foreground": "#f5f3ff", ring: "#7c3aed" },
  emerald: { primary: "#059669", "primary-foreground": "#ecfdf5", ring: "#059669" },
  cyan: { primary: "#0891b2", "primary-foreground": "#ecfeff", ring: "#0891b2" },
  indigo: { primary: "#4f46e5", "primary-foreground": "#eef2ff", ring: "#4f46e5" },
  pink: { primary: "#db2777", "primary-foreground": "#fdf2f8", ring: "#db2777" },
  red: { primary: "#dc2626", "primary-foreground": "#fef2f2", ring: "#dc2626" },
};

// ============================================================================
// Radius Map
// ============================================================================

export const RADIUS_MAP: Record<string, string> = {
  none: "0px",
  small: "0.375rem",
  medium: "0.625rem",
  large: "0.875rem",
};

// ============================================================================
// Font Map
// ============================================================================

export const FONT_MAP: Record<string, string> = {
  Inter: '"Inter-V", sans-serif',
  "Timeless Serif": '"Timeless Serif", ui-serif, Georgia, serif',
  "Timeless Sans": '"Timeless Sans", sans-serif',
};

// ============================================================================
// Spacing Map
// ============================================================================

export const SPACING_MAP: Record<string, string> = {
  dense: "0.5rem",
  compact: "0.75rem",
  normal: "1rem",
  spacious: "1.25rem",
};

// ============================================================================
// Styles — 5 named visual feel presets (shape/density/typography)
// ============================================================================

export interface StyleConfig {
  radius: string;
  spacing: string;
}

export const STYLES: Record<string, StyleConfig> = {
  vega: { radius: "medium", spacing: "normal" },
  nova: { radius: "small", spacing: "compact" },
  maia: { radius: "large", spacing: "spacious" },
  lyra: { radius: "none", spacing: "normal" },
  mira: { radius: "small", spacing: "dense" },
};

export const STYLE_NAMES = Object.keys(STYLES);
export const BASE_COLOR_NAMES = Object.keys(BASE_COLORS);
export const THEME_COLOR_NAMES = Object.keys(THEME_COLORS);

// Constant destructive tokens (same across all presets)
export const DESTRUCTIVE_TOKENS = {
  destructive: "#ef4444",
  "destructive-foreground": "#fafafa",
} as const;
