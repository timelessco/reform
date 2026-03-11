// ============================================================================
// Form Settings Types (for type-safe settings)
// ============================================================================

export type Language = "English" | "Spanish" | "French";

export type PopupTriggerType = "button" | "delay" | "scroll";
export type PopupButtonPosition = "bottom-right" | "bottom-left" | "center";
export type PopupAnimation = "fade" | "slide" | "scale";

export type EmbedType = "standard" | "popup" | "fullPage";

// ============================================================================
// Form Settings Interface (matches settings fields on forms table)
// ============================================================================
export interface FormSettings {
  // General
  language: string;
  redirectOnCompletion: boolean;
  redirectUrl: string | null;
  redirectDelay: number;
  progressBar: boolean;
  branding: boolean;
  dataRetention: boolean;
  dataRetentionDays: number | null;

  // Email Notifications
  selfEmailNotifications: boolean;
  notificationEmail: string | null;
  respondentEmailNotifications: boolean;
  respondentEmailSubject: string | null;
  respondentEmailBody: string | null;

  // Access
  passwordProtect: boolean;
  password: string | null;
  closeForm: boolean;
  closedFormMessage: string | null;
  closeOnDate: boolean;
  closeDate: string | null;
  limitSubmissions: boolean;
  maxSubmissions: number | null;
  preventDuplicateSubmissions: boolean;

  // Behavior
  autoJump: boolean;
  saveAnswersForLater: boolean;

  /**
   * Theme customization — flat `Record<string, string>`.
   *
   * Recognized keys:
   * - **Style**: `preset` (vega|nova|maia|lyra|mira|custom) — visual feel preset
   * - **Mode**: `mode` (light|dark) — form-scoped color mode
   * - **Simple**: `baseColor`, `themeColor`, `font`, `radius`, `spacing`
   * - **Layout**: `pageWidth`, `coverHeight`, `logoWidth`, `logoHeight`, `inputWidth`
   * - **Typography**: `baseFontSize`, `letterSpacing`
   * - **Advanced token overrides**: `primary`, `primary-foreground`, `secondary`, `secondary-foreground`,
   *   `accent`, `accent-foreground`, `background`, `foreground`, `destructive`, `destructive-foreground`,
   *   `input`, `border`, `muted`, `muted-foreground`, `ring`
   * - **Custom CSS**: `customCss`
   */
  customization: Record<string, string> | null;

  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// Public Form Settings (subset for public form page)
// ============================================================================
export interface PublicFormSettings {
  // Display
  progressBar: boolean;
  branding: boolean;
  autoJump: boolean;
  saveAnswersForLater: boolean;
  redirectOnCompletion: boolean;
  redirectUrl: string | null;
  redirectDelay: number;

  // Access gating
  language: string;
  passwordProtect: boolean;
  closeForm: boolean;
  closedFormMessage: string | null;
  closeOnDate: boolean;
  closeDate: string | null;
  limitSubmissions: boolean;
  maxSubmissions: number | null;
  preventDuplicateSubmissions: boolean;
}

export const defaultPublicFormSettings: PublicFormSettings = {
  progressBar: false,
  branding: true,
  autoJump: false,
  saveAnswersForLater: false,
  redirectOnCompletion: false,
  redirectUrl: null,
  redirectDelay: 0,
  language: "English",
  passwordProtect: false,
  closeForm: false,
  closedFormMessage: null,
  closeOnDate: false,
  closeDate: null,
  limitSubmissions: false,
  maxSubmissions: null,
  preventDuplicateSubmissions: false,
};

// ============================================================================
// Default Settings Values
// ============================================================================
export const defaultFormSettings: Omit<FormSettings, "createdAt" | "updatedAt"> = {
  language: "English",
  redirectOnCompletion: false,
  redirectUrl: null,
  redirectDelay: 0,
  progressBar: false,
  branding: true,
  dataRetention: false,
  dataRetentionDays: null,
  selfEmailNotifications: false,
  notificationEmail: null,
  respondentEmailNotifications: false,
  respondentEmailSubject: null,
  respondentEmailBody: null,
  passwordProtect: false,
  password: null,
  closeForm: false,
  closedFormMessage: null,
  closeOnDate: false,
  closeDate: null,
  limitSubmissions: false,
  maxSubmissions: null,
  preventDuplicateSubmissions: false,
  autoJump: false,
  saveAnswersForLater: true,
  customization: null,
};
