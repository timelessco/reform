/**
 * Singleton collection registry for query-backed collections.
 * Replaces Electric-backed singletons with query-backed equivalents.
 * Call initCollections(queryClient) once in _authenticated.tsx loader.
 */
import type { QueryClient } from "@tanstack/query-core";
import { createTransaction } from "@tanstack/react-db";
import { createWorkspaceSummaryCollection } from "./workspace-query.collection";
import type { WorkspaceSummary } from "./workspace-query.collection";
import {
  createFormListingCollection,
  createFavoriteCollection,
} from "./form-listing-query.collection";
import type { FormListing, FormFavorite } from "./form-listing-query.collection";
import type { FormDetail } from "./form-detail-query.collection";
import {
  createVersionListCollection,
  createVersionContentCollection,
} from "./version-query.collection";
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
    data: Record<string, unknown>,
  ) => Promise<{ workspace: WorkspaceSummary; txid: number }>;
  updateWorkspace: (
    data: Record<string, unknown>,
  ) => Promise<{ workspace: WorkspaceSummary; txid: number }>;
  deleteWorkspace: (data: Record<string, unknown>) => Promise<unknown>;
  createForm: (data: Record<string, unknown>) => Promise<{ form: FormDetail; txid: number }>;
  updateForm: (data: Record<string, unknown>) => Promise<{ form: FormDetail; txid: number }>;
  deleteForm: (data: Record<string, unknown>) => Promise<unknown>;
  addFavorite: (data: { formId: string }) => Promise<unknown>;
  removeFavorite: (data: { formId: string }) => Promise<unknown>;
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
      const result = await serverFns.updateWorkspace({ id: m.original.id, ...m.changes });
      if (result?.workspace) {
        const workspaces = _workspaces as NonNullable<typeof _workspaces>;
        workspaces.utils.writeUpdate(result.workspace);
      }
      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteWorkspace({ id: transaction.mutations[0].original.id });
    },
  });

  _formListings = createFormListingCollection({
    queryClient,
    queryFn: serverFns.getFormListings,
    onInsert: async ({ transaction }) => {
      await serverFns.createForm(
        transaction.mutations[0].modified as unknown as Record<string, unknown>,
      );
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      const result = await serverFns.updateForm({
        id: m.original.id,
        ...m.changes,
      } as unknown as Record<string, unknown>);
      if (result?.form) {
        const formListings = _formListings as NonNullable<typeof _formListings>;
        formListings.utils.writeUpdate(result.form);
      }
      return { refetch: false };
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

/**
 * Fetch full form detail from the server and enrich the formListings
 * collection record. Called client-side when the editor opens a form.
 * The enriched data (content, settings, etc.) is preserved across
 * listing refetches by the merge wrapper in createFormListingCollection.
 */
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

// --- Helper functions ---

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

  const { serverFns, formListings } = getInit();
  const tx = createTransaction({
    mutationFn: async () => {
      await serverFns.createForm(newForm as unknown as Record<string, unknown>);
    },
  });
  tx.mutate(() => {
    formListings.insert(newForm as unknown as FormListing);
  });

  return newForm;
};

export const duplicateFormById = (formId: string): Form => {
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
      await serverFns.createForm(newForm as unknown as Record<string, unknown>);
    },
  });
  tx.mutate(() => {
    formListings.insert(newForm as unknown as FormListing);
  });

  return newForm;
};

/** @deprecated Use duplicateFormById instead */
export const duplicateForm = (sourceForm: Form): Form => duplicateFormById(sourceForm.id);

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
