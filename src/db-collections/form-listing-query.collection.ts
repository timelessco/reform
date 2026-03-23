import { createCollection } from "@tanstack/db";
import type { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export type FormListing = {
  id: string;
  title: string | null;
  status: string;
  updatedAt: string;
  createdAt: string;
  workspaceId: string;
  icon: string | null;
  formName: string;
  customization?: Record<string, unknown> | null;
  deletedAt?: string | null;
};

export type FormFavorite = {
  id: string;
  userId: string;
  formId: string;
  createdAt: string;
};

type MutationHandler = (params: Record<string, unknown>) => Promise<unknown>;

type FormListingCollectionConfig = {
  queryClient: QueryClient;
  queryFn: () => Promise<FormListing[]>;
  onInsert?: MutationHandler;
  onUpdate?: MutationHandler;
  onDelete?: MutationHandler;
};

export const createFormListingCollection = (config: FormListingCollectionConfig) => {
  const { queryClient, queryFn, onInsert, onUpdate, onDelete } = config;

  return createCollection(
    queryCollectionOptions<FormListing, unknown, string[], string | number>({
      queryKey: ["form-listings"],
      queryFn: async () => queryFn(),
      queryClient,
      getKey: (item): string | number => item.id,
      onInsert,
      onUpdate,
      onDelete,
    }),
  );
};

type FavoriteCollectionConfig = {
  queryClient: QueryClient;
  queryFn: () => Promise<FormFavorite[]>;
  onInsert?: MutationHandler;
  onDelete?: MutationHandler;
};

export const createFavoriteCollection = (config: FavoriteCollectionConfig) => {
  const { queryClient, queryFn, onInsert, onDelete } = config;

  return createCollection(
    queryCollectionOptions<FormFavorite, unknown, string[], string | number>({
      queryKey: ["favorites"],
      queryFn: async () => queryFn(),
      queryClient,
      getKey: (item): string | number => item.id,
      onInsert,
      onDelete,
    }),
  );
};
