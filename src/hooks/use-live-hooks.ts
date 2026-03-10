import { count, eq, or, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { favoriteCollection } from "@/db-collections/favorite.collection";
import { formCollection, localFormCollection } from "@/db-collections/form.collections";
import { submissionCollection } from "@/db-collections/submission.collections";
import { workspaceCollection } from "@/db-collections/workspace.collection";

/**
 * Custom hook for real-time workspaces sync filtered by organization ID.
 */
export const useOrgWorkspaces = (organizationId?: string) =>
  useLiveQuery(
    (q) => {
      if (!organizationId) return undefined;
      return q
        .from({ ws: workspaceCollection })
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
      let query = q.from({ ws: workspaceCollection });
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
        .from({ form: formCollection })
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
 */
export const useOrgForms = (organizationId?: string) =>
  useLiveQuery(
    (q) => {
      if (!organizationId) return undefined;
      return q
        .from({ form: formCollection })
        .innerJoin({ ws: workspaceCollection }, ({ form, ws }) => eq(form.workspaceId, ws.id))
        .where(({ ws }) => eq(ws.organizationId, organizationId))
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
    },
    [organizationId],
  );

/**
 * Custom hook for real-time form sync by ID.
 */
export const useForm = (formId?: string) =>
  useLiveQuery(
    (q) => {
      if (!formId) return undefined;
      return q.from({ form: formCollection }).where(({ form }) => eq(form.id, formId));
    },
    [formId],
  );

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
        .from({ fav: favoriteCollection })
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
        .from({ fav: favoriteCollection })
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
 */
export const useFavoriteForms = (userId?: string) => {
  const { data } = useLiveQuery(
    (q) => {
      if (!userId) return undefined;
      return q
        .from({ fav: favoriteCollection })
        .innerJoin({ form: formCollection }, ({ fav, form }) => eq(fav.formId, form.id))
        .where(({ fav }) => eq(fav.userId, userId))
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
    },
    [userId],
  );
  return data ?? [];
};

/**
 * Custom hook for archived (trashed) forms with deletedAt field.
 */
export const useArchivedForms = () =>
  useLiveQuery((q) =>
    q
      .from({ form: formCollection })
      .where(({ form }) => eq(form.status, "archived"))
      .select(({ form }) => ({
        id: form.id,
        title: form.title,
        workspaceId: form.workspaceId,
        status: form.status,
        updatedAt: form.updatedAt,
        deletedAt: form.deletedAt,
      })),
  );

/**
 * Custom hook for real-time submission counts by formId.
 * Returns a Map<formId, count> for efficient lookups.
 */
export const useSubmissionCounts = () => {
  const { data } = useLiveQuery((q) =>
    q
      .from({ sub: submissionCollection })
      .groupBy(({ sub }) => sub.formId)
      .select(({ sub }) => ({
        formId: sub.formId,
        count: count(sub.id),
      })),
  );

  return useMemo(() => {
    if (!data) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const row of data) {
      counts.set(row.formId, row.count);
    }
    return counts;
  }, [data]);
};
