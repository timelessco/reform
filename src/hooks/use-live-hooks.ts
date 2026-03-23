import { eq, or, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import {
  getWorkspaces,
  getFormListings,
  getFavorites,
  getFormDetail,
} from "@/db-collections/collections";
import { localFormCollection } from "@/db-collections/local-form.collection";

/**
 * Custom hook for real-time workspaces sync filtered by organization ID.
 */
export const useOrgWorkspaces = (organizationId?: string) =>
  useLiveQuery(
    (q) => {
      if (!organizationId) return undefined;
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
      if (!workspaceId) return undefined;
      let query = q.from({ ws: getWorkspaces() });
      query = query.where(({ ws }) => eq(ws.id, workspaceId));
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
 * Custom hook for real-time forms sync filtered by workspace ID.
 */
export const useFormsForWorkspace = (workspaceId?: string) =>
  useLiveQuery(
    (q) => {
      if (!workspaceId) return undefined;
      return q
        .from({ form: getFormListings() })
        .where(({ form }) => eq(form.workspaceId, workspaceId))
        .where(({ form }) => or(eq(form.status, "draft"), eq(form.status, "published")))
        .select(({ form }) => ({
          id: form.id,
          title: form.title,
          workspaceId: form.workspaceId,
          status: form.status,
          updatedAt: form.updatedAt,
        }));
    },
    [workspaceId],
  );

/**
 * Custom hook for real-time forms sync filtered by organization.
 * The query-backed formListings collection already filters by org membership server-side.
 */
export const useOrgForms = (_organizationId?: string) =>
  useLiveQuery((q) => q
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
      .orderBy(({ form }) => form.updatedAt, "desc"), []);

/**
 * Custom hook for real-time form sync by ID.
 * Uses getFormDetail for full form data (used in editor).
 */
export const useForm = (formId?: string) => {
  const collection = formId ? getFormDetail(formId) : undefined;
  return useLiveQuery(
    (q) => {
      if (!formId || !collection) return undefined;
      return q.from({ form: collection }).where(({ form }) => eq(form.id, formId));
    },
    [formId],
  );
};

/**
 * Custom hook for real-time local form draft sync by ID.
 */
export const useLocalForm = (formId?: string) =>
  useLiveQuery(
    (q) => {
      if (!formId) return undefined;
      return q.from({ doc: localFormCollection }).where(({ doc }) => eq(doc.id, formId));
    },
    [formId],
  );

/**
 * Custom hook for real-time favorites sync for current user.
 */
export const useFavorites = (userId?: string) =>
  useLiveQuery(
    (q) => {
      if (!userId) return undefined;
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
      if (!userId || !formId) return undefined;
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
  const { data: allForms } = useLiveQuery(
    (q) =>
      q
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
        })),
    [],
  );

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
  useLiveQuery(
    (q) =>
      q
        .from({ form: getFormListings() })
        .where(({ form }) => eq(form.status, "archived"))
        .select(({ form }) => ({
          id: form.id,
          title: form.title,
          workspaceId: form.workspaceId,
          status: form.status,
          updatedAt: form.updatedAt,
          deletedAt: form.deletedAt,
        })),
    [],
  );

/**
 * Returns an empty submission count map.
 * Submission counts are now fetched via getSubmissionsCountQueryOption in components.
 */
export const useSubmissionCounts = () => useMemo(() => new Map<string, number>(), []);
