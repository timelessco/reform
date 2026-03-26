/**
 * Local-only form collection (localStorage-backed) for unauthenticated drafts.
 * In v0.6, localStorageCollectionOptions moved from @tanstack/react-db to @tanstack/db.
 *
 * TODO: Migrate to persistedCollectionOptions + SQLite WASM once
 * the browser-db-sqlite-persistence package is compatible with tanstack/db 0.6.
 */
import { createCollection, localStorageCollectionOptions } from "@tanstack/db";
import { z } from "zod";
import { createFormHeaderNode } from "@/lib/form-header-factory";

/** Parse Postgres timestamp (no TZ) as UTC before converting to ISO. */
const parseAsUTC = (val: string): string => {
  if (val.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(val)) return new Date(val).toISOString();
  return new Date(val.replace(" ", "T") + "Z").toISOString();
};

const timestampField = z
  .string()
  .optional()
  .transform((val) => (val ? parseAsUTC(val) : new Date().toISOString()));

const SettingsSchema = z.object({
  defaultRequiredValidation: z.boolean().default(true),
  numericInput: z.boolean().default(false),
  focusOnError: z.boolean().default(true),
  validationMethod: z.enum(["onChange", "onBlur", "onDynamic"]).default("onDynamic"),
  asyncValidation: z.number().min(0).max(10000).default(500),
  activeTab: z.enum(["builder", "template", "settings", "generate"]).default("builder"),
  preferredSchema: z.enum(["zod", "valibot", "arktype"]).default("zod"),
  preferredFramework: z.enum(["react", "vue", "angular", "solid"]).default("react"),
  preferredPackageManager: z.enum(["pnpm", "npm", "yarn", "bun"]).default("pnpm"),
  isCodeSidebarOpen: z.boolean().default(false),
});

export type FormBuilderSettings = z.infer<typeof SettingsSchema>;

export const FormSchema = z.object({
  id: z.string().uuid(),
  createdByUserId: z.string().optional(),
  workspaceId: z.string().uuid(),
  title: z.string().default("Untitled"),
  formName: z.string().default("draft"),
  schemaName: z.string().default("draftFormSchema"),
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- Plate editor content is deeply nested with variable structure
  content: z.array(z.any()).default([]),
  settings: SettingsSchema.optional(),
  icon: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
  isMultiStep: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  deletedAt: timestampField.nullable().optional(),
  lastPublishedVersionId: z.string().nullable().optional(),
  publishedContentHash: z.string().nullable().optional(),
  language: z.string().default("English"),
  redirectOnCompletion: z.coerce.boolean().default(false),
  redirectUrl: z.string().nullable().optional(),
  redirectDelay: z.coerce.number().default(0),
  progressBar: z.coerce.boolean().default(false),
  branding: z.coerce.boolean().default(true),
  autoJump: z.coerce.boolean().default(false),
  saveAnswersForLater: z.coerce.boolean().default(true),
  selfEmailNotifications: z.coerce.boolean().default(false),
  notificationEmail: z.string().nullable().optional(),
  respondentEmailNotifications: z.coerce.boolean().default(false),
  respondentEmailSubject: z.string().nullable().optional(),
  respondentEmailBody: z.string().nullable().optional(),
  passwordProtect: z.coerce.boolean().default(false),
  password: z.string().nullable().optional(),
  closeForm: z.coerce.boolean().default(false),
  closedFormMessage: z.string().nullable().optional(),
  closeOnDate: z.coerce.boolean().default(false),
  closeDate: z.string().nullable().optional(),
  limitSubmissions: z.coerce.boolean().default(false),
  maxSubmissions: z.coerce.number().nullable().optional(),
  preventDuplicateSubmissions: z.coerce.boolean().default(false),
  dataRetention: z.coerce.boolean().default(false),
  dataRetentionDays: z.coerce.number().nullable().optional(),
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- customization values have variable types
  customization: z.record(z.string(), z.any()).default({}),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type Form = z.infer<typeof FormSchema>;

export const localFormCollection = createCollection(
  localStorageCollectionOptions({
    id: "draft-form",
    storageKey: "draft-form",
    schema: FormSchema,
    getKey: (item) => item.id,
  }),
);

export const DEFAULT_FORM_CONTENT = [
  createFormHeaderNode({ title: "Untitled", icon: null, cover: null }),
  {
    children: [{ text: "Start building your form..." }],
    type: "p",
  },
];

export const DEFAULT_FORM_SETTINGS: FormBuilderSettings = {
  defaultRequiredValidation: true,
  numericInput: false,
  focusOnError: true,
  validationMethod: "onDynamic",
  asyncValidation: 500,
  activeTab: "builder",
  preferredSchema: "zod",
  preferredFramework: "react",
  preferredPackageManager: "pnpm",
  isCodeSidebarOpen: false,
};
