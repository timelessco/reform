import type { QueryClient } from "@tanstack/query-core";
import { createTransaction } from "@tanstack/react-db";
import { createWorkspaceSummaryCollection } from "./workspace-query.collection";
import type { WorkspaceSummary } from "./workspace-query.collection";
import {
  createFormListingCollection,
  createFavoriteCollection,
} from "./form-listing-query.collection";
import type { FormListing, FormFavorite } from "./form-listing-query.collection";
import type { createForm, updateForm, deleteForm } from "@/lib/fn/forms";
import type { createWorkspace, updateWorkspace, deleteWorkspace } from "@/lib/fn/workspaces";
import type { addFavorite, removeFavorite } from "@/lib/fn/favorites";
import {
  createVersionListCollection,
  createVersionContentCollection,
} from "./version-query.collection";

// Utility types to extract input/output from TanStack server functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `any` required: function constraints need contravariant params
type ServerFn = (...args: any[]) => any;
type ServerFnInput<T extends ServerFn> = NonNullable<Parameters<T>[0]>["data"];
type ServerFnOutput<T extends ServerFn> = Awaited<ReturnType<T>>;

/** Convert null values to undefined so collection data aligns with Zod-validated server fn inputs */
type NullToUndefined<T> = {
  [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
};
const stripNulls = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v]),
  ) as NullToUndefined<T>;
import type { VersionListItem, VersionContent } from "./version-query.collection";
import { createSubmissionSummaryCollection } from "./submission-query.collection";
import { DEFAULT_FORM_CONTENT, DEFAULT_FORM_SETTINGS } from "./local-form.collection";
import type { Form, FormBuilderSettings } from "./local-form.collection";
import { logger } from "@/lib/utils";

// Re-export types consumers need
export type { Form, FormBuilderSettings } from "./local-form.collection";
export type { WorkspaceSummary } from "./workspace-query.collection";
export type { FormListing, FormFavorite } from "./form-listing-query.collection";
export type { FormDetail } from "./form-detail-query.collection";
export { resolveFormRoute } from "./form-detail-query.collection";

// --- Server function imports (lazy to avoid circular deps) ---
let _serverFns: {
  getWorkspacesWithForms: () => Promise<{ workspaces: WorkspaceSummary[] }>;
  getFormListings: () => Promise<FormListing[]>;
  getFormDetail: (formId: string) => Promise<Form | null>;
  getFavorites: () => Promise<FormFavorite[]>;
  getVersionList: (formId: string) => Promise<VersionListItem[]>;
  getVersionContent: (versionId: string) => Promise<VersionContent | null>;
  getSubmissionsCount: (formId: string) => Promise<{ total: number }>;
  createWorkspace: (
    data: ServerFnInput<typeof createWorkspace>,
  ) => Promise<ServerFnOutput<typeof createWorkspace>>;
  updateWorkspace: (
    data: ServerFnInput<typeof updateWorkspace>,
  ) => Promise<ServerFnOutput<typeof updateWorkspace>>;
  deleteWorkspace: (
    data: ServerFnInput<typeof deleteWorkspace>,
  ) => Promise<ServerFnOutput<typeof deleteWorkspace>>;
  createForm: (
    data: ServerFnInput<typeof createForm>,
  ) => Promise<ServerFnOutput<typeof createForm>>;
  updateForm: (
    data: ServerFnInput<typeof updateForm>,
  ) => Promise<ServerFnOutput<typeof updateForm>>;
  deleteForm: (
    data: ServerFnInput<typeof deleteForm>,
  ) => Promise<ServerFnOutput<typeof deleteForm>>;
  addFavorite: (
    data: ServerFnInput<typeof addFavorite>,
  ) => Promise<ServerFnOutput<typeof addFavorite>>;
  removeFavorite: (
    data: ServerFnInput<typeof removeFavorite>,
  ) => Promise<ServerFnOutput<typeof removeFavorite>>;
} | null = null;

let _queryClient: QueryClient | null = null;

// --- Singleton collection instances ---
let _workspaces: ReturnType<typeof createWorkspaceSummaryCollection> | null = null;
let _formListings: ReturnType<typeof createFormListingCollection> | null = null;
let _favorites: ReturnType<typeof createFavoriteCollection> | null = null;
const _enrichedFormIds = new Set<string>();
const _versionListCache = new Map<string, ReturnType<typeof createVersionListCollection>>();
const _versionContentCache = new Map<string, ReturnType<typeof createVersionContentCollection>>();
const _submissionCache = new Map<string, ReturnType<typeof createSubmissionSummaryCollection>>();

// --- Init ---

export const initCollections = (
  queryClient: QueryClient,
  serverFns: typeof _serverFns & object,
) => {
  _queryClient = queryClient;
  _serverFns = serverFns;

  // Create singleton instances
  _workspaces = createWorkspaceSummaryCollection({
    queryClient,
    queryFn: serverFns.getWorkspacesWithForms,
    onInsert: async ({ transaction }) => {
      const ws = transaction.mutations[0].modified;
      await serverFns.createWorkspace({
        id: ws.id,
        organizationId: ws.organizationId,
        name: ws.name,
      });
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      await serverFns.updateWorkspace({ id: m.original.id, ...m.changes });
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteWorkspace({ id: transaction.mutations[0].original.id });
    },
  });

  _formListings = createFormListingCollection({
    queryClient,
    queryFn: serverFns.getFormListings,
    onInsert: async ({ transaction }) => {
      const modified = transaction.mutations[0].modified;
      await serverFns.createForm(stripNulls(modified) as ServerFnInput<typeof createForm>);
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      await serverFns.updateForm(
        stripNulls({
          id: m.original.id,
          ...m.changes,
        }) as ServerFnInput<typeof updateForm>,
      );
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteForm({ id: transaction.mutations[0].original.id });
    },
  });

  _favorites = createFavoriteCollection({
    queryClient,
    queryFn: serverFns.getFavorites,
    onInsert: async ({ transaction }) => {
      await serverFns.addFavorite({ formId: transaction.mutations[0].modified.formId });
    },
    onDelete: async ({ transaction }) => {
      await serverFns.removeFavorite({ formId: transaction.mutations[0].original.formId });
    },
  });
};

// --- Getters ---

export const isInitialized = () => _serverFns !== null && _queryClient !== null;

const ensureInit = () => {
  if (!_serverFns || !_queryClient) {
    throw new Error("Collections not initialized. Call initCollections() first.");
  }
};

/** Return all initialized singletons, throwing if not yet initialized. */
const getInit = () => {
  ensureInit();
  return {
    serverFns: _serverFns as NonNullable<typeof _serverFns>,
    queryClient: _queryClient as NonNullable<typeof _queryClient>,
    workspaces: _workspaces as NonNullable<typeof _workspaces>,
    formListings: _formListings as NonNullable<typeof _formListings>,
    favorites: _favorites as NonNullable<typeof _favorites>,
  };
};

export const getWorkspaces = () => getInit().workspaces;

export const getFormListings = () => getInit().formListings;

export const getFavorites = () => getInit().favorites;

export const enrichFormDetail = async (formId: string) => {
  const { serverFns, formListings } = getInit();
  if (_enrichedFormIds.has(formId)) return null;
  const detail = await serverFns.getFormDetail(formId);
  if (detail) {
    const existing = formListings.get(formId);
    formListings.utils.writeUpdate({
      ...existing,
      ...detail,
      id: formId,
    } as unknown as FormListing);
    _enrichedFormIds.add(formId);
  }
  return null;
};

export const getVersionList = (formId: string) => {
  const { queryClient, serverFns } = getInit();
  let collection = _versionListCache.get(formId);
  if (!collection) {
    collection = createVersionListCollection({
      queryClient,
      formId,
      queryFn: () => serverFns.getVersionList(formId),
    });
    _versionListCache.set(formId, collection);
  }
  return collection;
};

export const getVersionContent = (versionId: string) => {
  const { queryClient, serverFns } = getInit();
  let collection = _versionContentCache.get(versionId);
  if (!collection) {
    collection = createVersionContentCollection({
      queryClient,
      versionId,
      queryFn: () => serverFns.getVersionContent(versionId),
    });
    _versionContentCache.set(versionId, collection);
  }
  return collection;
};

export const getSubmissionSummary = (formId: string) => {
  const { queryClient, serverFns } = getInit();
  let collection = _submissionCache.get(formId);
  if (!collection) {
    collection = createSubmissionSummaryCollection({
      queryClient,
      formId,
      queryFn: () => serverFns.getSubmissionsCount(formId),
    });
    _submissionCache.set(formId, collection);
  }
  return collection;
};

export const createFormLocal = (
  workspaceId: string,
  title = "Untitled",
): { form: Form; persisted: Promise<void> } => {
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

  const { serverFns, formListings } = getInit();
  const tx = createTransaction({
    mutationFn: async () => {
      await serverFns.createForm(newForm);
      await formListings.utils.refetch();
    },
  });
  tx.mutate(() => {
    formListings.insert(newForm as unknown as FormListing);
  });

  return { form: newForm, persisted: tx.isPersisted.promise.then(() => undefined) };
};

export const duplicateFormById = (formId: string): { form: Form; persisted: Promise<void> } => {
  const { formListings } = getInit();
  const sourceForm = formListings.get(formId) as Form | undefined;
  if (!sourceForm) throw new Error(`Form not found: ${formId}`);

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

  const { serverFns } = getInit();
  const tx = createTransaction({
    mutationFn: async () => {
      await serverFns.createForm(newForm);
      await formListings.utils.refetch();
    },
  });
  tx.mutate(() => {
    formListings.insert(newForm as unknown as FormListing);
  });

  return { form: newForm, persisted: tx.isPersisted.promise.then(() => undefined) };
};

/** @deprecated Use duplicateFormById instead */
export const duplicateForm = (sourceForm: Form) => duplicateFormById(sourceForm.id);

export const updateDoc = async (id: string, updater: (draft: Form) => void) => {
  const { formListings } = getInit();
  logger("updateDoc", id);
  formListings.update(id, (draft: Record<string, unknown>) => {
    updater(draft as Form);
    draft.updatedAt = new Date().toISOString();
  });
};

export const updateFormStatus = async (id: string, status: "draft" | "published" | "archived") => {
  const { formListings } = getInit();
  formListings.update(id, (draft: Record<string, unknown>) => {
    draft.status = status;
    draft.updatedAt = new Date().toISOString();
  });
};

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
) => {
  const { formListings } = getInit();
  formListings.update(id, (draft: Record<string, unknown>) => {
    if (header.title !== undefined) draft.title = header.title;
    if (header.icon !== undefined) draft.icon = header.icon;
    if (header.cover !== undefined) draft.cover = header.cover;
    if (header.workspaceId !== undefined) draft.workspaceId = header.workspaceId;
    if (header.createdAt !== undefined) draft.createdAt = header.createdAt;
    if (header.updatedAt !== undefined) draft.updatedAt = header.updatedAt;
  });
};

export const updateSettings = async (id: string, settings: Partial<FormBuilderSettings>) => {
  const { formListings } = getInit();
  logger("updateSettings", id, Object.keys(settings));
  formListings.update(id, (draft: Record<string, unknown>) => {
    draft.settings = { ...(draft.settings as Record<string, unknown>), ...settings };
    draft.updatedAt = new Date().toISOString();
  });
};

export const restoreFormLocal = async (id: string) => {
  const { formListings } = getInit();
  formListings.update(id, (draft: Record<string, unknown>) => {
    draft.status = "draft";
    draft.deletedAt = null;
    draft.updatedAt = new Date().toISOString();
  });
};

export const permanentDeleteFormLocal = async (id: string) => {
  getInit().formListings.delete(id);
};

export const createWorkspaceLocal = async (
  organizationId: string,
  name = "Collection",
): Promise<WorkspaceSummary> => {
  const { workspaces } = getInit();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const ws: WorkspaceSummary = {
    id,
    organizationId,
    name,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    forms: [],
  };
  workspaces.insert(ws);
  return ws;
};

export const updateWorkspaceName = async (id: string, name: string) => {
  const { workspaces } = getInit();
  workspaces.update(id, (draft: Record<string, unknown>) => {
    draft.name = name;
    draft.updatedAt = new Date().toISOString();
  });
};

export const deleteWorkspaceLocal = async (id: string) => {
  getInit().workspaces.delete(id);
};

export const toggleFavoriteLocal = async (userId: string, formId: string) => {
  const { favorites } = getInit();
  const id = `${userId}:${formId}`;
  const existing = favorites.get(id);

  if (existing) {
    favorites.delete(id);
  } else {
    favorites.insert({
      id,
      userId,
      formId,
      createdAt: new Date().toISOString(),
    });
  }
};

export const getQueryClient = () => getInit().queryClient;
