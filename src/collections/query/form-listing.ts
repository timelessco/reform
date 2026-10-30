import { collectionOptions, createCollection } from "@tanstack/db";
import type { DbClient, InsertMutationFn, UpdateMutationFn, DeleteMutationFn } from "@tanstack/db";
import type { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { bindBrowserDbClient } from "@/db/db-client";
import { queryKeys } from "@/lib/query-keys";
import type { FormSettings } from "@/types/form-settings";

export type FormListing = {
  id: string;
  shortId: string;
  title: string | null;
  status: string;
  updatedAt: string;
  createdAt: string;
  workspaceId: string;
  icon: string | null;
  formName: string;
  sortIndex?: string | null;
  customization?: Record<string, unknown> | null;
  submissionCount: number;
  /** Working draft of behavioral settings (forms.draftSettings). */
  draftSettings?: FormSettings;
  /** Live published settings (form_settings.settings). Null until first publish creates the row. */
  liveSettings?: FormSettings | null;
  slug?: string | null;
  customDomainId?: string | null;
  publishedContentHash?: string | null;
  lastPublishedVersionId?: string | null;
  // Heavy fields. Enrichment populates them on demand when the editor opens a form.
  content?: unknown[];
  schemaName?: string | null;
  cover?: string | null;
  /** Generated content thumbnail (Plate render → Blob). Card preview + OG image. */
  previewImageUrl?: string | null;
  createdByUserId?: string | null;
};

export type FormFavorite = {
  id: string;
  userId: string;
  formId: string;
  sortIndex?: string | null;
  createdAt: string;
};

type FormListingCollectionConfig = {
  queryClient: QueryClient;
  queryFn: () => Promise<FormListing[]>;
  onInsert?: InsertMutationFn<FormListing>;
  onUpdate?: UpdateMutationFn<FormListing>;
  onDelete?: DeleteMutationFn<FormListing>;
};

/**
 * Per-client config and instances. DB 1.0 scopes a collection to its `DbClient`, and a
 * server request's config (query cache, server functions) must not leak into another
 * request's, so both maps are keyed by the client that materialized the collection.
 */
const configsByClient = new WeakMap<DbClient, FormListingCollectionConfig>();

const collectionsByClient = new WeakMap<
  DbClient,
  { get: (id: string | number) => FormListing | undefined }
>();

/** Point a client at the data source its collection will sync through. */
export const configureFormListings = (client: DbClient, config: FormListingCollectionConfig) => {
  configsByClient.set(client, config);
};

/**
 * Descriptor for the form-listing collection.
 *
 * A route loader that preloads a live query over this collection and the browser that
 * hydrates the result have to materialize it from their own client, which a module-level
 * `createCollection` cannot do. `collectionOptions` keeps one definition while letting
 * each client build its own collection from its own config.
 */
export const formListingsDescriptor = collectionOptions("form-listings", (client: DbClient) => {
  const config = configsByClient.get(client);

  if (!config) {
    throw new Error(
      "Form listings are not configured for this DbClient: call configureFormListings()",
    );
  }

  const { queryClient, queryFn, onInsert, onUpdate, onDelete } = config;

  // Merges lightweight listings onto enriched records so refetches don't wipe heavy fields.
  const enrichedQueryFn = async () => {
    const listings = await queryFn();
    const collection = collectionsByClient.get(client);

    if (!collection) return listings;

    // Skip per-item merge when nothing has been enriched yet
    if (!listings.some((l) => collection.get(l.id)?.content !== undefined)) return listings;

    return listings.map((listing) => {
      const existing = collection.get(listing.id);

      return existing ? { ...existing, ...listing } : listing;
    });
  };

  return queryCollectionOptions<FormListing, unknown, string[]>({
    id: "form-listings",
    queryKey: queryKeys.formListings(),
    queryFn: enrichedQueryFn,
    queryClient,
    getKey: (item): string | number => item.id,
    staleTime: 1000 * 60 * 5,
    onInsert,
    onUpdate,
    onDelete,
  });
});

export const createFormListingCollection = (config: FormListingCollectionConfig) => {
  const client = bindBrowserDbClient(config.queryClient);
  configureFormListings(client, config);

  const collection = client.collection(formListingsDescriptor);

  collectionsByClient.set(
    client,
    collection as { get: (id: string | number) => FormListing | undefined },
  );

  return collection;
};

type FavoriteCollectionConfig = {
  queryClient: QueryClient;
  queryFn: () => Promise<FormFavorite[]>;
  onInsert?: InsertMutationFn<FormFavorite>;
  onUpdate?: UpdateMutationFn<FormFavorite>;
  onDelete?: DeleteMutationFn<FormFavorite>;
};

export const createFavoriteCollection = (config: FavoriteCollectionConfig) => {
  const { queryClient, queryFn, onInsert, onUpdate, onDelete } = config;

  return createCollection(
    queryCollectionOptions<FormFavorite, unknown, string[]>({
      queryKey: queryKeys.favorites(),
      queryFn: async () => queryFn(),
      queryClient,
      getKey: (item): string | number => item.id,
      staleTime: 1000 * 60 * 5,
      onInsert,
      onUpdate,
      onDelete,
    }),
  );
};
