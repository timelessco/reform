/**
 * Shared query-option factories for TanStack DB collections; source of truth for the query keys
 * loaders prefetch so the cache is warm on collection init. Keys come from query-keys.ts, which
 * collections also read, so the two sides cannot drift.
 */

import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { WorkspaceSummary } from "@/collections/query/workspace";
import { getFormListings } from "@/lib/server-fn/forms";
import { getFavorites } from "@/lib/server-fn/favorites";
import { getWorkspaces } from "@/lib/server-fn/workspaces";

const FIVE_MINUTES = 1000 * 60 * 5;

/** Workspaces with empty forms[]. WorkspaceSummary.forms is vestigial, nothing reads it; the
 * sidebar form list comes from the form-listings collection (joined by form.workspaceId), content
 * enriched on demand (useForm/enrichFormDetail). Lightweight workspaces is intentional.
 * Shared by prefetch below + the workspaces collection's injected queryFn (_authenticated.tsx) so they can't drift. */
export const fetchWorkspacesWithEmptyForms = async (): Promise<WorkspaceSummary[]> => {
  const result = await getWorkspaces();

  return result.workspaces.map((ws) => ({ ...ws, forms: [] }));
};

/** Prefetch-friendly query options for the workspaces collection. */
export const workspacesCollectionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.workspacesWithForms(),
    queryFn: fetchWorkspacesWithEmptyForms,
    staleTime: FIVE_MINUTES,
  });

/** Prefetch-friendly query options for form listings. */
export const formListingsCollectionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.formListings(),
    queryFn: () => getFormListings(),
    staleTime: FIVE_MINUTES,
  });

/** Prefetch-friendly query options for the current user's favourites. */
export const favoritesCollectionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.favorites(),
    queryFn: () => getFavorites(),
    staleTime: FIVE_MINUTES,
  });
