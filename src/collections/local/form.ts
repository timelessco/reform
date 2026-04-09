/**
 * Local-only form collection for unauthenticated drafts.
 *
 * Backed by SQLite/OPFS via @tanstack/browser-db-sqlite-persistence when
 * available, falling back to localStorage on SSR or if OPFS is unavailable
 * (old Safari, private mode). Initialized via `initLocalFormCollection()`
 * at app root; consumers access it through `getLocalFormCollection()`.
 */
import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import { z } from "zod";
import { createFormHeaderNode } from "@/lib/form-schema/form-header-factory";

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
  customization: z.record(z.string(), z.any()).default({}),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type Form = z.infer<typeof FormSchema>;

export type LocalFormCollection = ReturnType<typeof buildLocalStorageCollection>;

// Fallback for SSR and browsers without OPFS/SharedArrayBuffer (old Safari,
// private mode). Applies zod defaults via `schema`.
const buildLocalStorageCollection = () =>
  createCollection(
    localStorageCollectionOptions({
      id: "draft-form",
      storageKey: "draft-form",
      schema: FormSchema,
      getKey: (item) => item.id,
    }),
  );

// SQLite-backed, local-only. Omitting `sync` puts `persistedCollectionOptions`
// in "sync-absent" mode where the framework auto-generates a loopback sync
// config that hydrates from SQLite and auto-persists mutations.
//
// ⚠️  SCHEMA VERSIONING: any change to `FormSchema` (new/removed fields,
// type changes) must bump `schemaVersion` below. The default
// `schemaMismatchPolicy` is `sync-present-reset` which auto-drops the
// SQLite table on version bump — unsynced draft data is lost. Acceptable
// for pre-prod, revisit before shipping to users with real drafts.
//
// Also note: the local-only overload doesn't accept a `schema` prop, so
// zod defaults are NOT applied on insert. Seed call sites must pass any
// fields the readers depend on (e.g. `customization: {}`).
const buildPersistedCollection = (
  persistence: PersistedCollectionPersistence,
): LocalFormCollection =>
  createCollection(
    persistedCollectionOptions<Form, string>({
      id: "draft-form",
      getKey: (item) => item.id,
      persistence,
      schemaVersion: 1,
    }) as unknown as Parameters<typeof createCollection<Form, string>>[0],
  ) as unknown as LocalFormCollection;

let localFormCollectionRef: LocalFormCollection | null = null;

/** First call wins. Falls back to localStorage if `persistence` is null. */
export const initLocalFormCollection = async (
  persistence: PersistedCollectionPersistence | null,
): Promise<LocalFormCollection> => {
  if (localFormCollectionRef) return localFormCollectionRef;
  localFormCollectionRef = persistence
    ? buildPersistedCollection(persistence)
    : buildLocalStorageCollection();
  return localFormCollectionRef;
};

export const getLocalFormCollection = (): LocalFormCollection => {
  if (!localFormCollectionRef) {
    throw new Error(
      "localFormCollection not initialized. Call initLocalFormCollection() at app root first.",
    );
  }
  return localFormCollectionRef;
};

export const isLocalFormCollectionReady = () => localFormCollectionRef !== null;

/**
 * Drop the in-memory reference so the next init builds a fresh collection
 * against a freshly-initialized persistence bundle. Call on logout BEFORE
 * `disposePersistence()` — leaving a stale ref pointing at a disposed
 * coordinator makes subsequent mutations no-op silently.
 */
export const disposeLocalFormCollection = () => {
  localFormCollectionRef = null;
};

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
