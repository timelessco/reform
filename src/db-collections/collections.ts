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
import { createFormDetailCollection } from "./form-detail-query.collection";
import type { FormDetail } from "./form-detail-query.collection";
import {
  createVersionListCollection,
  createVersionContentCollection,
} from "./version-query.collection";
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
  getVersionList: (formId: string) => Promise<any[]>;
  getVersionContent: (versionId: string) => Promise<any>;
  getSubmissionsCount: (formId: string) => Promise<{ total: number }>;
  createWorkspace: (data: Record<string, unknown>) => Promise<unknown>;
  updateWorkspace: (data: Record<string, unknown>) => Promise<unknown>;
  deleteWorkspace: (data: Record<string, unknown>) => Promise<unknown>;
  createForm: (data: Record<string, unknown>) => Promise<unknown>;
  updateForm: (data: Record<string, unknown>) => Promise<unknown>;
  deleteForm: (data: Record<string, unknown>) => Promise<unknown>;
  addFavorite: (data: { formId: string }) => Promise<unknown>;
  removeFavorite: (data: { formId: string }) => Promise<unknown>;
} | null = null;

let _queryClient: QueryClient | null = null;

// --- Singleton collection instances ---
let _workspaces: ReturnType<typeof createWorkspaceSummaryCollection> | null = null;
let _formListings: ReturnType<typeof createFormListingCollection> | null = null;
let _favorites: ReturnType<typeof createFavoriteCollection> | null = null;
const _formDetailCache = new Map<string, ReturnType<typeof createFormDetailCollection>>();
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
    onInsert: async ({ transaction }: Record<string, any>) => {
      const ws = transaction.mutations[0].modified;
      await serverFns.createWorkspace({
        id: ws.id,
        organizationId: ws.organizationId,
        name: ws.name,
      });
    },
    onUpdate: async ({ transaction }: Record<string, any>) => {
      const m = transaction.mutations[0];
      await serverFns.updateWorkspace({ id: m.original.id, ...m.changes });
    },
    onDelete: async ({ transaction }: Record<string, any>) => {
      await serverFns.deleteWorkspace({ id: transaction.mutations[0].original.id });
    },
  });

  _formListings = createFormListingCollection({
    queryClient,
    queryFn: serverFns.getFormListings,
    onInsert: async ({ transaction }: Record<string, any>) => {
      await serverFns.createForm(transaction.mutations[0].modified);
    },
    onUpdate: async ({ transaction }: Record<string, any>) => {
      const m = transaction.mutations[0];
      await serverFns.updateForm({ id: m.original.id, ...m.changes });
    },
    onDelete: async ({ transaction }: Record<string, any>) => {
      await serverFns.deleteForm({ id: transaction.mutations[0].original.id });
    },
  });

  _favorites = createFavoriteCollection({
    queryClient,
    queryFn: serverFns.getFavorites,
    onInsert: async ({ transaction }: Record<string, any>) => {
      await serverFns.addFavorite({ formId: transaction.mutations[0].modified.formId });
    },
    onDelete: async ({ transaction }: Record<string, any>) => {
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

export const getWorkspaces = () => {
  ensureInit();
  return _workspaces!;
};

export const getFormListings = () => {
  ensureInit();
  return _formListings!;
};

export const getFavorites = () => {
  ensureInit();
  return _favorites!;
};

export const getFormDetail = (formId: string) => {
  ensureInit();
  let collection = _formDetailCache.get(formId);
  if (!collection) {
    collection = createFormDetailCollection({
      queryClient: _queryClient!,
      formId,
      queryFn: () => _serverFns!.getFormDetail(formId) as Promise<FormDetail | null>,
      onUpdate: async ({ transaction }: Record<string, any>) => {
        const m = transaction.mutations[0];
        await _serverFns!.updateForm({ id: m.original.id, ...m.changes });
      },
    });
    _formDetailCache.set(formId, collection);
  }
  return collection;
};

export const getVersionList = (formId: string) => {
  ensureInit();
  let collection = _versionListCache.get(formId);
  if (!collection) {
    collection = createVersionListCollection({
      queryClient: _queryClient!,
      formId,
      queryFn: () => _serverFns!.getVersionList(formId),
    });
    _versionListCache.set(formId, collection);
  }
  return collection;
};

export const getVersionContent = (versionId: string) => {
  ensureInit();
  let collection = _versionContentCache.get(versionId);
  if (!collection) {
    collection = createVersionContentCollection({
      queryClient: _queryClient!,
      versionId,
      queryFn: () => _serverFns!.getVersionContent(versionId),
    });
    _versionContentCache.set(versionId, collection);
  }
  return collection;
};

export const getSubmissionSummary = (formId: string) => {
  ensureInit();
  let collection = _submissionCache.get(formId);
  if (!collection) {
    collection = createSubmissionSummaryCollection({
      queryClient: _queryClient!,
      formId,
      queryFn: () => _serverFns!.getSubmissionsCount(formId),
    });
    _submissionCache.set(formId, collection);
  }
  return collection;
};

// --- Helper functions (match Electric collection API surface) ---

export const createFormLocal = async (workspaceId: string, title = "Untitled"): Promise<Form> => {
  ensureInit();
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

  const detail = getFormDetail(id);
  const tx = createTransaction({
    mutationFn: async () => {
      await _serverFns!.createForm(newForm as unknown as Record<string, unknown>);
    },
  });
  tx.mutate(() => {
    detail.insert(newForm as any);
  });

  return newForm;
};

export const duplicateFormById = (formId: string): Form => {
  ensureInit();
  const detail = getFormDetail(formId);
  const sourceForm = detail.get(formId) as Form | undefined;
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

  const tx = createTransaction({
    mutationFn: async () => {
      await _serverFns!.createForm(newForm as unknown as Record<string, unknown>);
    },
  });
  tx.mutate(() => {
    const newDetail = getFormDetail(id);
    newDetail.insert(newForm as any);
  });

  return newForm;
};

/** @deprecated Use duplicateFormById instead */
export const duplicateForm = (sourceForm: Form): Form => duplicateFormById(sourceForm.id);

export const updateDoc = async (id: string, updater: (draft: Form) => void) => {
  const detail = getFormDetail(id);
  logger("updateDoc", id);
  detail.update(id, (draft: any) => {
    updater(draft as Form);
    draft.updatedAt = new Date().toISOString();
  });
};

export const updateFormStatus = async (id: string, status: "draft" | "published" | "archived") => {
  const detail = getFormDetail(id);
  detail.update(id, (draft: any) => {
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
  const detail = getFormDetail(id);
  detail.update(id, (draft: any) => {
    if (header.title !== undefined) draft.title = header.title;
    if (header.icon !== undefined) draft.icon = header.icon;
    if (header.cover !== undefined) draft.cover = header.cover;
    if (header.workspaceId !== undefined) draft.workspaceId = header.workspaceId;
    if (header.createdAt !== undefined) draft.createdAt = header.createdAt;
    if (header.updatedAt !== undefined) draft.updatedAt = header.updatedAt;
  });
};

export const updateSettings = async (id: string, settings: Partial<FormBuilderSettings>) => {
  const detail = getFormDetail(id);
  logger("updateSettings", id, Object.keys(settings));
  detail.update(id, (draft: any) => {
    draft.settings = { ...draft.settings, ...settings };
    draft.updatedAt = new Date().toISOString();
  });
};

export const restoreFormLocal = async (id: string) => {
  const detail = getFormDetail(id);
  detail.update(id, (draft: any) => {
    draft.status = "draft";
    draft.deletedAt = null;
    draft.updatedAt = new Date().toISOString();
  });
};

export const permanentDeleteFormLocal = async (id: string) => {
  const detail = getFormDetail(id);
  detail.delete(id);
};

export const createWorkspaceLocal = async (
  organizationId: string,
  name = "Collection",
): Promise<WorkspaceSummary> => {
  ensureInit();
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
  _workspaces!.insert(ws);
  return ws;
};

export const updateWorkspaceName = async (id: string, name: string) => {
  _workspaces!.update(id, (draft: any) => {
    draft.name = name;
    draft.updatedAt = new Date().toISOString();
  });
};

export const deleteWorkspaceLocal = async (id: string) => {
  _workspaces!.delete(id);
};

export const toggleFavoriteLocal = async (userId: string, formId: string) => {
  ensureInit();
  const id = `${userId}:${formId}`;
  const existing = _favorites!.get(id);

  if (existing) {
    _favorites!.delete(id);
  } else {
    _favorites!.insert({
      id,
      userId,
      formId,
      createdAt: new Date().toISOString(),
    });
  }
};

export const getQueryClient = () => {
  ensureInit();
  return _queryClient!;
};
