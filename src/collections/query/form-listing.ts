import { createCollection } from "@tanstack/db";
import type { InsertMutationFn, UpdateMutationFn, DeleteMutationFn } from "@tanstack/db";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
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
  submissionCount: number;
  // Heavy fields — populated on-demand when editor opens a form (enrichment)
  content?: unknown[];
  settings?: Record<string, unknown>;
  schemaName?: string | null;
  cover?: string | null;
  [key: string]: unknown;
};

export type FormFavorite = {
  id: string;
  userId: string;
  formId: string;
  createdAt: string;
};

type FormListingCollectionConfig = {
  queryClient: QueryClient;
  queryFn: () => Promise<FormListing[]>;
  persistence?: PersistedCollectionPersistence | null;
  onInsert?: InsertMutationFn<FormListing, string | number>;
  onUpdate?: UpdateMutationFn<FormListing, string | number>;
  onDelete?: DeleteMutationFn<FormListing, string | number>;
};

export const createFormListingCollection = (config: FormListingCollectionConfig) => {
  const { queryClient, queryFn, persistence, onInsert, onUpdate, onDelete } = config;

  // Closure ref set after collection creation — used by enrichedQueryFn
  // to merge lightweight listing data with existing enriched records,
  // preventing refetches from wiping heavy fields (content, settings, etc.).
  let collectionRef: { get: (id: string | number) => FormListing | undefined } | null = null;

  const enrichedQueryFn = async () => {
    const listings = await queryFn();
    const ref = collectionRef;
    if (!ref) return listings;
    // Short-circuit: skip per-item merge when no forms have been enriched yet
    if (!listings.some((l) => ref.get(l.id)?.content !== undefined)) return listings;
    return listings.map((listing) => {
      const existing = ref.get(listing.id);
      return existing ? { ...existing, ...listing } : listing;
    });
  };

  const baseOptions = queryCollectionOptions<FormListing, unknown, string[], string | number>({
    id: "form-listings",
    queryKey: ["form-listings"],
    queryFn: enrichedQueryFn,
    queryClient,
    getKey: (item): string | number => item.id,
    staleTime: 1000 * 60 * 5,
    onInsert,
    onUpdate,
    onDelete,
  });

  const collection = persistence
    ? createCollection(
        persistedCollectionOptions({
          ...baseOptions,
          persistence,
          schemaVersion: 1,
        }) as unknown as typeof baseOptions,
      )
    : createCollection(baseOptions);

  collectionRef = collection;
  return collection;
};

type FavoriteCollectionConfig = {
  queryClient: QueryClient;
  queryFn: () => Promise<FormFavorite[]>;
  persistence?: PersistedCollectionPersistence | null;
  onInsert?: InsertMutationFn<FormFavorite, string | number>;
  onDelete?: DeleteMutationFn<FormFavorite, string | number>;
};

export const createFavoriteCollection = (config: FavoriteCollectionConfig) => {
  const { queryClient, queryFn, persistence, onInsert, onDelete } = config;

  const baseOptions = queryCollectionOptions<FormFavorite, unknown, string[], string | number>({
    id: "favorites",
    queryKey: ["favorites"],
    queryFn: async () => queryFn(),
    queryClient,
    getKey: (item): string | number => item.id,
    staleTime: 1000 * 60 * 5,
    onInsert,
    onDelete,
  });

  if (!persistence) {
    return createCollection(baseOptions);
  }

  const persistedOptions = persistedCollectionOptions({
    ...baseOptions,
    persistence,
    schemaVersion: 1,
  });
  return createCollection(persistedOptions as unknown as typeof baseOptions);
};
