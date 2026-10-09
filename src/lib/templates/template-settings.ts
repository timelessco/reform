import { defaultFormSettings } from "@/types/form-settings";
import type { FormSettings } from "@/types/form-settings";

// Allowlist (default-deny): only purely presentational settings survive into a template.
// New FormSettings fields are excluded by default until explicitly added here.
export const TEMPLATE_SETTINGS_ALLOWLIST = [
  "language",
  "progressBar",
  "presentationMode",
  "saveAnswersForLater",
  "preventDuplicateSubmissions",
] as const satisfies readonly (keyof FormSettings)[];

export type TemplateSettings = Pick<FormSettings, (typeof TEMPLATE_SETTINGS_ALLOWLIST)[number]>;

// Keyed 1:1 with TEMPLATE_SETTINGS_ALLOWLIST; TemplateSettings is derived from it, so a
// missing or misspelled key fails this function's return-type check.
export const pickTemplateSettings = (settings: FormSettings): TemplateSettings => ({
  language: settings.language,
  progressBar: settings.progressBar,
  presentationMode: settings.presentationMode,
  saveAnswersForLater: settings.saveAnswersForLater,
  preventDuplicateSubmissions: settings.preventDuplicateSubmissions,
});

// Clone-side: rebuild full settings from defaults, overlaying only the allowlisted subset.
export const applyTemplateSettings = (picked: TemplateSettings): FormSettings => ({
  ...defaultFormSettings,
  ...picked,
});
