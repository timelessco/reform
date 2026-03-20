import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import {
  createCollection,
  createTransaction,
  localStorageCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";
import { createForm, deleteForm, updateForm } from "@/lib/fn/forms";
import { logger } from "@/lib/utils";
import { electricFetchClient, getElectricUrl, handleElectricError, timestampField } from "./shared";
import type { ServerTxResult } from "./shared";

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
  id: z.uuid(),
  createdByUserId: z.string().optional(),
  workspaceId: z.uuid(),
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
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- customization values have variable types (string, number, boolean)
  customization: z.record(z.string(), z.any()).default({}),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type Form = z.infer<typeof FormSchema>;

export const formCollection = createCollection(
  electricCollectionOptions({
    id: "forms",
    schema: FormSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "forms" },
      fetchClient: electricFetchClient,
      onError: handleElectricError,
      parser: {
        timestamptz: (date: string) => date,
        timestamp: (date: string) => date,
      },
    },
    getKey: (item) => item.id,
    startSync: false, // Sync starts in _authenticated.tsx loader after auth is confirmed
    syncMode: "on-demand",
    onInsert: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await createForm({ data: m.modified })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },
    onUpdate: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          logger("changes", Object.keys(m.changes));
          const result = (await updateForm({
            data: { ...m.changes, id: m.original.id },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },

    onDelete: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await deleteForm({
            data: { id: m.original.id },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
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

import { createFormHeaderNode } from "@/lib/form-header-factory";

const DEFAULT_FORM_CONTENT = [
  createFormHeaderNode({ title: "Untitled", icon: null, cover: null }),
  {
    children: [{ text: "Start building your form..." }],
    type: "p",
  },
];

const DEFAULT_FORM_SETTINGS: FormBuilderSettings = {
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

/**
 * Updates the form content (Plate editor value).
 */
const _updateContent = async (id: string, content: unknown[]) =>
  formCollection.update(id, (draft) => {
    draft.content = content;
    draft.updatedAt = new Date().toISOString();
  });

/**
 * Updates the form header fields (title, icon, cover).
 */
export const updateHeader = async (
  id: string,
  header: {
    title?: string;
    icon?: string;
    cover?: string;
    workspaceId: string;
    createdAt: string;
    updatedAt: string;
  },
) =>
  formCollection.update(id, (draft) => {
    if (header.title !== undefined) draft.title = header.title;
    if (header.icon !== undefined) draft.icon = header.icon;
    if (header.cover !== undefined) draft.cover = header.cover;
    if (header.workspaceId !== undefined) draft.workspaceId = header.workspaceId;
    if (header.createdAt !== undefined) draft.createdAt = header.createdAt;
    if (header.updatedAt !== undefined) draft.updatedAt = header.updatedAt;
  });

/**
 * Updates general form settings.
 */
export const updateSettings = async (id: string, settings: Partial<typeof DEFAULT_FORM_SETTINGS>) =>
  formCollection.update(id, (draft) => {
    logger("updateSettings", id, Object.keys(settings));
    draft.settings = { ...draft.settings, ...settings };
    draft.updatedAt = new Date().toISOString();
  });

/**
 * Generic update for when we need to batch multiple changes.
 */
export const updateDoc = async (id: string, updater: (draft: Form) => void) =>
  formCollection.update(id, (draft) => {
    logger("updateDoc", id);
    updater(draft as Form);
    draft.updatedAt = new Date().toISOString();
  });

/**
 * Updates the form status (draft, published, archived).
 */
export const updateFormStatus = async (id: string, status: "draft" | "published" | "archived") =>
  formCollection.update(id, (draft) => {
    draft.status = status;
    draft.updatedAt = new Date().toISOString();
  });

/**
 * Creates a new form with default values and returns the new document.
 */
export const createFormLocal = async (workspaceId: string, title = "Untitled"): Promise<Form> => {
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
    language: "English",
    redirectOnCompletion: false,
    redirectDelay: 0,
    progressBar: false,
    branding: true,
    autoJump: false,
    saveAnswersForLater: true,
    selfEmailNotifications: false,
    respondentEmailNotifications: false,
    passwordProtect: false,
    closeForm: false,
    closeOnDate: false,
    limitSubmissions: false,
    preventDuplicateSubmissions: false,
    dataRetention: false,
    customization: {},
    createdAt: now,
    updatedAt: now,
  };

  await formCollection.insert(newForm);
  return newForm;
};

/**
 * Deletes a form by ID.
 */
const _deleteFormLocal = async (id: string): Promise<void> => {
  await formCollection.delete(id);
};

/**
 * Duplicates a form by ID and returns the new document.
 * The new form's title will be "{original title} copy"
 */
export const duplicateFormById = (formId: string): Form => {
  const sourceForm = formCollection.state.get(formId);
  if (!sourceForm) {
    throw new Error(`Form not found: ${formId}`);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = sourceForm.title ? `${sourceForm.title} copy` : "Untitled copy";

  const newForm: Form = {
    ...sourceForm,
    id,
    title,
    content: structuredClone(sourceForm.content),
    settings: structuredClone(sourceForm.settings),
    status: "draft",
    lastPublishedVersionId: null,
    publishedContentHash: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // Same pattern as publishForm/restoreVersion in use-form-versions.ts:
  // Optimistic insert applied instantly, server call runs in background via mutationFn.
  // onInsert does NOT fire because the mutation is owned by the transaction.
  // On success → confirmed; on error → auto-rollback.
  const tx = createTransaction({
    mutationFn: async () => {
      await createForm({ data: newForm });
    },
  });

  tx.mutate(() => {
    formCollection.insert(newForm);
  });

  return newForm;
};

/**
 * @deprecated Use duplicateFormById instead
 */
export const duplicateForm = (sourceForm: Form): Form => duplicateFormById(sourceForm.id);

/**
 * Moves a form to a different workspace.
 */
const _moveFormToWorkspace = async (formId: string, targetWorkspaceId: string): Promise<void> => {
  await formCollection.update(formId, (draft) => {
    draft.workspaceId = targetWorkspaceId;
    draft.updatedAt = new Date().toISOString();
  });
};

/**
 * Archives a form (moves to trash).
 * Sets status to 'archived' and records deletedAt timestamp.
 */
const _archiveFormLocal = async (id: string): Promise<void> => {
  await formCollection.update(id, (draft) => {
    draft.status = "archived";
    draft.deletedAt = new Date().toISOString();
    draft.updatedAt = new Date().toISOString();
  });
};

/**
 * Restores a form from trash.
 * Sets status back to 'draft' and clears deletedAt.
 */
export const restoreFormLocal = async (id: string): Promise<void> => {
  await formCollection.update(id, (draft) => {
    draft.status = "draft";
    draft.deletedAt = null;
    draft.updatedAt = new Date().toISOString();
  });
};

/**
 * Permanently deletes a form (cannot be undone).
 */
export const permanentDeleteFormLocal = async (id: string): Promise<void> => {
  await formCollection.delete(id);
};
