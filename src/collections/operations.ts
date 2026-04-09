import { createTransaction } from "@tanstack/react-db";
import { createVersionContentCollection, createVersionListCollection } from "./query/version";
import type { FormListing } from "./query/form-listing";
import type { WorkspaceSummary } from "./query/workspace";
import { DEFAULT_FORM_CONTENT, DEFAULT_FORM_SETTINGS } from "./local/form";
import type { Form } from "./local/form";
import { getInit, state } from "./_state";

// --- Getters ---

export const getWorkspaces = () => getInit().workspaces;
export const getFormListings = () => getInit().formListings;
export const getFavorites = () => getInit().favorites;
export const getQueryClient = () => getInit().queryClient;

export const enrichFormDetail = async (formId: string) => {
  const { serverFns, formListings } = getInit();
  if (state.enrichedFormIds.has(formId)) return null;
  const detail = await serverFns.getFormDetail(formId);
  if (detail) {
    const existing = formListings.get(formId);
    formListings.utils.writeUpdate({
      ...existing,
      ...detail,
      id: formId,
    } as unknown as FormListing);
    state.enrichedFormIds.add(formId);
  }
  return null;
};

export const getVersionList = (formId: string) => {
  const { queryClient, serverFns } = getInit();
  let collection = state.versionListCache.get(formId);
  if (!collection) {
    collection = createVersionListCollection({
      queryClient,
      formId,
      queryFn: () => serverFns.getVersionList(formId),
    });
    state.versionListCache.set(formId, collection);
  }
  return collection;
};

export const getVersionContent = (versionId: string) => {
  const { queryClient, serverFns } = getInit();
  let collection = state.versionContentCache.get(versionId);
  if (!collection) {
    collection = createVersionContentCollection({
      queryClient,
      versionId,
      queryFn: () => serverFns.getVersionContent(versionId),
    });
    state.versionContentCache.set(versionId, collection);
  }
  return collection;
};

// --- Form mutations ---

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
  const { serverFns, formListings } = getInit();
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

export const updateFormStatus = async (id: string, status: "draft" | "published" | "archived") => {
  const { formListings } = getInit();
  formListings.update(id, (draft: Record<string, unknown>) => {
    draft.status = status;
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

// --- Workspace mutations ---

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

// --- Favorite mutations ---

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

// --- Type re-exports ---
export type { Form } from "./local/form";
export type { WorkspaceSummary } from "./query/workspace";
export type { FormListing, FormFavorite } from "./query/form-listing";
