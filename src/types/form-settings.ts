// ============================================================================
// Form Settings Types (for type-safe settings)
// ============================================================================

export type Language = "English" | "Spanish" | "French";

export type PopupTriggerType = "button" | "delay" | "scroll";
export type PopupButtonPosition = "bottom-right" | "bottom-left" | "center";
export type PopupAnimation = "fade" | "slide" | "scale";

export type EmbedType = "standard" | "popup" | "fullPage";

// ============================================================================
// Form Settings Interface (matches form_settings table)
// ============================================================================
export interface FormSettings {
  id: string;
  formId: string;

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
export const defaultFormSettings: Omit<FormSettings, "id" | "formId" | "createdAt" | "updatedAt"> =
  {
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
    saveAnswersForLater: false,
  };
