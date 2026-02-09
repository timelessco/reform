import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { z } from "zod";
import { createForm, deleteForm, updateForm } from "@/lib/fn/forms";
import { logger } from "@/lib/utils";
import { electricFetchClient, getElectricUrl, type ServerTxResult, timestampField } from "./shared";

// ============================================================================
// Form Builder Settings Schema
// ============================================================================

export const SettingsSchema = z.object({
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

// ============================================================================
// Form Schema
// ============================================================================

export const FormSchema = z.object({
  id: z.string().uuid(),
  createdByUserId: z.string().optional(), // Injected by server
  workspaceId: z.string().uuid(),
  title: z.string().default("Untitled"),
  formName: z.string().default("draft"),
  schemaName: z.string().default("draftFormSchema"),
  content: z.array(z.any()).default([]),
  settings: z
    .object({
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
      // New Tally-style settings
      language: z.string().default("English"),
      redirectOnCompletion: z.boolean().default(false),
      progressBar: z.boolean().default(false),
      tallyBranding: z.boolean().default(true),
      dataRetention: z.boolean().default(true),
      selfEmailNotifications: z.boolean().default(false),
      respondentEmailNotifications: z.boolean().default(false),
      passwordProtect: z.boolean().default(false),
      closeForm: z.boolean().default(false),
      closeOnDate: z.boolean().default(false),
      limitSubmissions: z.boolean().default(false),
      closedFormMessage: z.string().default("This form is now closed."),
      preventDuplicateSubmissions: z.boolean().default(false),
      autoJump: z.boolean().default(false),
      saveAnswersForLater: z.boolean().default(true),
    })
    .optional(),
  icon: z.string().nullable().optional(),
  cover: z.string().nullable().optional(),
  isMultiStep: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  deletedAt: timestampField.nullable().optional(), // Soft delete timestamp
  // Version history fields
  lastPublishedVersionId: z.string().nullable().optional(),
  publishedContentHash: z.string().nullable().optional(),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type Form = z.infer<typeof FormSchema>;

// ============================================================================
// Collections with ElectricSQL sync
// ============================================================================

export const formCollection = createCollection(
  electricCollectionOptions({
    id: "forms",
    schema: FormSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "forms" },
      fetchClient: electricFetchClient,
    },
    getKey: (item) => item.id,
    startSync: true,
    syncMode: "eager",
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      const result = (await createForm({ data: newItem })) as ServerTxResult;
      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0];
      logger("changes", changes.content);
      const result = await updateForm({
        data: { ...changes, id: original.id },
      });
      return { txid: (result as ServerTxResult).txid };
    },

    onDelete: async ({ transaction }) => {
      const deletedItem = transaction.mutations[0].original;
      const result = (await deleteForm({
        data: { id: deletedItem.id },
      })) as ServerTxResult;
      return { txid: result.txid };
    },
  }),
);

export const localFormCollection = createCollection(
  localStorageCollectionOptions({
    id: "draft-form",
    storageKey: "draft-form",
    schema: FormSchema,
    getKey: (item) => item.id,
  }),
);


// ============================================================================
// Form Service Functions
// ============================================================================

import type { Value } from "platejs";
import { createFormHeaderNode } from "@/components/ui/form-header-node";

const DEFAULT_FORM_CONTENT = [
  createFormHeaderNode({ title: "Untitled", icon: null, cover: null }),
  {
    children: [{ text: "Start building your form..." }],
    type: "p",
  },
];

const DEFAULT_FORM_SETTINGS = {
  defaultRequiredValidation: true,
  numericInput: false,
  focusOnError: true,
  validationMethod: "onDynamic" as const,
  asyncValidation: 500,
  activeTab: "builder" as const,
  preferredSchema: "zod" as const,
  preferredFramework: "react" as const,
  preferredPackageManager: "pnpm" as const,
  isCodeSidebarOpen: false,
  language: "English",
  redirectOnCompletion: false,
  progressBar: false,
  tallyBranding: true,
  dataRetention: true,
  selfEmailNotifications: false,
  respondentEmailNotifications: false,
  passwordProtect: false,
  closeForm: false,
  closeOnDate: false,
  limitSubmissions: false,
  closedFormMessage: "This form is now closed.",
  preventDuplicateSubmissions: false,
  autoJump: false,
  saveAnswersForLater: true,
};

/**
 * Updates the form content (Plate editor value).
 */
export async function updateContent(id: string, content: Value) {
  return formCollection.update(id, (draft) => {
    draft.content = content;
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Updates the form header fields (title, icon, cover).
 */
export async function updateHeader(
  id: string,
  header: {
    title?: string;
    icon?: string;
    cover?: string;
    workspaceId: string;
    createdAt: string;
    updatedAt: string;
  },
) {
  return formCollection.update(id, (draft) => {
    if (header.title !== undefined) draft.title = header.title;
    if (header.icon !== undefined) draft.icon = header.icon;
    if (header.cover !== undefined) draft.cover = header.cover;
    if (header.workspaceId !== undefined) draft.workspaceId = header.workspaceId;
    if (header.createdAt !== undefined) draft.createdAt = header.createdAt;
    if (header.updatedAt !== undefined) draft.updatedAt = header.updatedAt;
  });
}

/**
 * Updates general form settings.
 */
export async function updateSettings(id: string, settings: Partial<typeof DEFAULT_FORM_SETTINGS>) {
  return formCollection.update(id, (draft) => {
    draft.settings = { ...draft.settings, ...settings };
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Generic update for when we need to batch multiple changes.
 */
export async function updateDoc(id: string, updater: (draft: any) => void) {
  return formCollection.update(id, (draft) => {
    logger(draft, "draft");
    updater(draft);
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Updates the form status (draft, published, archived).
 */
export async function updateFormStatus(id: string, status: "draft" | "published" | "archived") {
  return formCollection.update(id, (draft) => {
    draft.status = status;
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Creates a new form with default values and returns the new document.
 */
export async function createFormLocal(workspaceId: string, title = "Untitled"): Promise<Form> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newForm: Form = {
    id,
    workspaceId,
    title,
    formName: "draft",
    schemaName: "draftFormSchema",
    content: DEFAULT_FORM_CONTENT,
    settings: DEFAULT_FORM_SETTINGS,
    icon: null,
    cover: null,
    isMultiStep: false,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await formCollection.insert(newForm);
  return newForm;
}

/**
 * Deletes a form by ID.
 */
export async function deleteFormLocal(id: string): Promise<void> {
  await formCollection.delete(id);
}

/**
 * Duplicates a form by ID and returns the new document.
 * The new form's title will be "{original title} copy"
 */
export async function duplicateForm(sourceForm: Form): Promise<Form> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = sourceForm.title ? `${sourceForm.title} copy` : "Untitled copy";

  const newForm: Form = {
    ...sourceForm,
    id,
    title,
    createdAt: now,
    updatedAt: now,
  };

  await formCollection.insert(newForm);
  return newForm;
}

/**
 * Moves a form to a different workspace.
 */
export async function moveFormToWorkspace(
  formId: string,
  targetWorkspaceId: string,
): Promise<void> {
  await formCollection.update(formId, (draft) => {
    draft.workspaceId = targetWorkspaceId;
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Archives a form (moves to trash).
 * Sets status to 'archived' and records deletedAt timestamp.
 */
export async function archiveFormLocal(id: string): Promise<void> {
  await formCollection.update(id, (draft) => {
    draft.status = "archived";
    draft.deletedAt = new Date().toISOString();
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Restores a form from trash.
 * Sets status back to 'draft' and clears deletedAt.
 */
export async function restoreFormLocal(id: string): Promise<void> {
  await formCollection.update(id, (draft) => {
    draft.status = "draft";
    draft.deletedAt = null;
    draft.updatedAt = new Date().toISOString();
  });
}

/**
 * Permanently deletes a form (cannot be undone).
 */
export async function permanentDeleteFormLocal(id: string): Promise<void> {
  await formCollection.delete(id);
}
