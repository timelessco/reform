/**
 * Client command layer for form and workspace mutations.
 * Centralizes optimistic mutation orchestration for query-backed collections.
 */
import type { QueryClient } from "@tanstack/query-core";
import { createWorkspaceSummaryCollection } from "./workspace-query.collection";
import type { WorkspaceSummary } from "./workspace-query.collection";
import {
  createFormListingCollection,
  createFavoriteCollection,
} from "./form-listing-query.collection";
import type { FormListing, FormFavorite } from "./form-listing-query.collection";
import type { FormDetail } from "./form-detail-query.collection";

type ServerFns = {
  getWorkspacesWithForms: () => Promise<{ workspaces: WorkspaceSummary[] }>;
  getFormListings: () => Promise<FormListing[]>;
  getFormDetail: (formId: string) => Promise<FormDetail | null>;
  getFavorites: () => Promise<FormFavorite[]>;
  createWorkspace: (data: { id: string; organizationId: string; name: string }) => Promise<unknown>;
  updateWorkspace: (data: { id: string; name: string }) => Promise<unknown>;
  deleteWorkspace: (data: { id: string }) => Promise<unknown>;
  createForm: (data: Record<string, unknown>) => Promise<unknown>;
  updateForm: (data: Record<string, unknown>) => Promise<unknown>;
  deleteForm: (data: { id: string }) => Promise<unknown>;
  addFavorite: (data: { formId: string }) => Promise<unknown>;
  removeFavorite: (data: { formId: string }) => Promise<unknown>;
};

type CommandLayerConfig = {
  queryClient: QueryClient;
  serverFns: ServerFns;
};

export const createCommandLayer = (config: CommandLayerConfig) => {
  const { queryClient, serverFns } = config;

  const workspaces = createWorkspaceSummaryCollection({
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
      await serverFns.updateWorkspace({
        id: m.original.id,
        name: m.changes.name ?? m.original.name,
      });
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteWorkspace({ id: transaction.mutations[0].original.id });
    },
  });

  const formListings = createFormListingCollection({
    queryClient,
    queryFn: serverFns.getFormListings,
    onInsert: async ({ transaction }) => {
      const modified = transaction.mutations[0].modified;
      await serverFns.createForm(modified as unknown as Record<string, unknown>);
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      await serverFns.updateForm({ id: m.original.id, ...m.changes } as unknown as Record<
        string,
        unknown
      >);
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteForm({ id: transaction.mutations[0].original.id });
    },
  });

  const favorites = createFavoriteCollection({
    queryClient,
    queryFn: serverFns.getFavorites,
    onInsert: async ({ transaction }) => {
      await serverFns.addFavorite({ formId: transaction.mutations[0].modified.formId });
    },
    onDelete: async ({ transaction }) => {
      await serverFns.removeFavorite({ formId: transaction.mutations[0].original.formId });
    },
  });

  return {
    workspaces,
    formListings,
    favorites,
  };
};
