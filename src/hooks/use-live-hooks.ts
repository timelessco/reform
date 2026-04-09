import { eq, or, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  isInitialized,
  getWorkspaces,
  getFormListings,
  getFavorites,
  enrichFormDetail,
} from "@/collections";
import { getLocalFormCollection, isLocalFormCollectionReady } from "@/collections/local/form";

/**
 * Custom hook for real-time workspaces sync filtered by organization ID.
 */
export const useOrgWorkspaces = (organizationId?: string) =>
  useLiveQuery(
    (q) => {
      if (!organizationId || !isInitialized()) return undefined;
      return q
        .from({ ws: getWorkspaces() })
        .where(({ ws }) => eq(ws.organizationId, organizationId))
        .select(({ ws }) => ({
          id: ws.id,
          organizationId: ws.organizationId,
          createdByUserId: ws.createdByUserId,
          name: ws.name,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
        }));
    },
    [organizationId],
  );

/**
 * Custom hook for real-time workspace sync by ID.
 */
export const useWorkspace = (workspaceId?: string) => {
  const result = useLiveQuery(
    (q) => {
      if (!workspaceId || !isInitialized()) return undefined;
      const query = q.from({ ws: getWorkspaces() }).where(({ ws }) => eq(ws.id, workspaceId));
      return query.select(({ ws }) => ({
        id: ws.id,
        organizationId: ws.organizationId,
        createdByUserId: ws.createdByUserId,
        name: ws.name,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      }));
    },
    [workspaceId],
  );
  return { ...result, data: result.data?.[0] };
};

/**
 * Custom hook for real-time forms sync filtered by organization.
 * The query-backed formListings collection already filters by org membership server-side.
 */
export const useOrgForms = (_organizationId?: string) =>
  useLiveQuery((q) => {
    if (!isInitialized()) return undefined;
    return q
      .from({ form: getFormListings() })
      .where(({ form }) => or(eq(form.status, "draft"), eq(form.status, "published")))
      .select(({ form }) => ({
        id: form.id,
        title: form.title,
        workspaceId: form.workspaceId,
        status: form.status,
        updatedAt: form.updatedAt,
        icon: form.icon,
        customization: form.customization,
      }))
      .orderBy(({ form }) => form.updatedAt, "desc");
  }, []);

/**
 * Custom hook for real-time form sync by ID.
 * Queries the unified formListings collection and enriches with full
 * detail (content, settings, etc.) on demand via a TanStack Query.
 */
export const useForm = (formId?: string) => {
  const result = useLiveQuery(
    (q) => {
      if (!formId || !isInitialized()) return undefined;
      return q.from({ form: getFormListings() }).where(({ form }) => eq(form.id, formId));
    },
    [formId],
  );

  // Enrich with full detail if content not yet loaded
  const needsEnrichment = !!formId && isInitialized() && result.data?.[0]?.content === undefined;
  useQuery({
    queryKey: ["form-enrich", formId],
    queryFn: () => enrichFormDetail(formId as string),
    enabled: needsEnrichment,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return result;
};

/**
 * Custom hook for real-time local form draft sync by ID.
 */
export const useLocalForm = (formId?: string) =>
  useLiveQuery(
    (q) => {
      if (!formId || !isLocalFormCollectionReady()) return undefined;
      return q.from({ doc: getLocalFormCollection() }).where(({ doc }) => eq(doc.id, formId));
    },
    [formId],
  );

/**
 * Custom hook for real-time favorites sync for current user.
 */
export const useFavorites = (userId?: string) =>
  useLiveQuery(
    (q) => {
      if (!userId || !isInitialized()) return undefined;
      return q
        .from({ fav: getFavorites() })
        .where(({ fav }) => eq(fav.userId, userId))
        .select(({ fav }) => ({
          id: fav.id,
          userId: fav.userId,
          formId: fav.formId,
          createdAt: fav.createdAt,
        }));
    },
    [userId],
  );

/**
 * Check if a specific form is favorited by the user.
 */
export const useIsFavorite = (userId?: string, formId?: string) => {
  const { data } = useLiveQuery(
    (q) => {
      if (!userId || !formId || !isInitialized()) return undefined;
      return q
        .from({ fav: getFavorites() })
        .where(({ fav }) => eq(fav.userId, userId))
        .where(({ fav }) => eq(fav.formId, formId))
        .select(({ fav }) => ({ id: fav.id }));
    },
    [userId, formId],
  );
  return data !== undefined && data.length > 0;
};

/**
 * Get user's favorite forms with full form data.
 * Fetches favorites and form listings separately and combines them.
 */
export const useFavoriteForms = (userId?: string) => {
  const { data: favs } = useFavorites(userId);
  const { data: allForms } = useLiveQuery((q) => {
    if (!isInitialized()) return undefined;
    return q
      .from({ form: getFormListings() })
      .where(({ form }) => or(eq(form.status, "draft"), eq(form.status, "published")))
      .select(({ form }) => ({
        id: form.id,
        title: form.title,
        workspaceId: form.workspaceId,
        status: form.status,
        updatedAt: form.updatedAt,
        icon: form.icon,
        customization: form.customization,
      }));
  }, []);

  return useMemo(() => {
    if (!favs || !allForms) return [];
    const favFormIds = new Set(favs.map((f) => f.formId));
    return allForms.filter((f) => favFormIds.has(f.id));
  }, [favs, allForms]);
};

/**
 * Custom hook for archived (trashed) forms with deletedAt field.
 */
export const useArchivedForms = () =>
  useLiveQuery((q) => {
    if (!isInitialized()) return undefined;
    return q
      .from({ form: getFormListings() })
      .where(({ form }) => eq(form.status, "archived"))
      .select(({ form }) => ({
        id: form.id,
        title: form.title,
        workspaceId: form.workspaceId,
        status: form.status,
        updatedAt: form.updatedAt,
        deletedAt: form.deletedAt,
      }));
  }, []);

/**
 * Returns a Map of formId → submission count derived from form listings.
 */
export const useSubmissionCounts = () => {
  const { data: allForms } = useLiveQuery((q) => {
    if (!isInitialized()) return undefined;
    return q.from({ form: getFormListings() }).select(({ form }) => ({
      id: form.id,
      submissionCount: form.submissionCount,
    }));
  }, []);

  return useMemo(() => {
    const map = new Map<string, number>();
    if (allForms) {
      for (const form of allForms) {
        if (form.submissionCount > 0) {
          map.set(form.id, form.submissionCount);
        }
      }
    }
    return map;
  }, [allForms]);
};
