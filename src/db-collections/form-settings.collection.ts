import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { electricFetchClient, getElectricUrl, type ServerTxResult, timestampField } from "./shared";

// ============================================================================
// Form Settings Schema
// ============================================================================

const FormSettingsSchema = z.object({
  id: z.string(),
  formId: z.string(),
  language: z.string().default("English"),
  redirectOnCompletion: z.coerce.boolean().default(false),
  redirectUrl: z.string().nullable().default(null),
  redirectDelay: z.coerce.number().default(0),
  progressBar: z.coerce.boolean().default(false),
  branding: z.coerce.boolean().default(true),
  autoJump: z.coerce.boolean().default(false),
  saveAnswersForLater: z.coerce.boolean().default(true),
  selfEmailNotifications: z.coerce.boolean().default(false),
  notificationEmail: z.string().nullable().default(null),
  respondentEmailNotifications: z.coerce.boolean().default(false),
  respondentEmailSubject: z.string().nullable().default(null),
  respondentEmailBody: z.string().nullable().default(null),
  passwordProtect: z.coerce.boolean().default(false),
  password: z.string().nullable().default(null),
  closeForm: z.coerce.boolean().default(false),
  closedFormMessage: z.string().nullable().default("This form is now closed."),
  closeOnDate: z.coerce.boolean().default(false),
  closeDate: z.string().nullable().default(null),
  limitSubmissions: z.coerce.boolean().default(false),
  maxSubmissions: z.coerce.number().nullable().default(null),
  preventDuplicateSubmissions: z.coerce.boolean().default(false),
  dataRetention: z.coerce.boolean().default(false),
  dataRetentionDays: z.coerce.number().nullable().default(null),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type FormSettingsDoc = z.infer<typeof FormSettingsSchema>;

// ============================================================================
// Collection with ElectricSQL sync
// ============================================================================

export const formSettingsCollection = createCollection(
  electricCollectionOptions({
    id: "form_settings",
    schema: FormSettingsSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "form_settings" },
      fetchClient: electricFetchClient,
    },
    getKey: (item) => item.id,
    startSync: false,
    onUpdate: async ({ transaction }) => {
      const { updateFormSettings } = await import("@/lib/fn/form-settings");
      const { original, changes } = transaction.mutations[0];
      const result = await updateFormSettings({
        data: { id: original.id, ...changes },
      });
      return { txid: (result as ServerTxResult).txid };
    },
  }),
);
