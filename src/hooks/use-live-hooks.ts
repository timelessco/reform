import { count, eq, or, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import {
  favoriteCollection,
  formCollection,
  localFormCollection,
  submissionCollection,
  workspaceCollection,
} from "@/db-collections";

/**
 * Custom hook for real-time workspaces sync.
 */
export const useWorkspaces = () => {
  return useLiveQuery((q) =>
    q.from({ ws: workspaceCollection }).select(({ ws }) => ({
      id: ws.id,
      organizationId: ws.organizationId,
      createdByUserId: ws.createdByUserId,
      name: ws.name,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    })),
  );
};

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
export const useFormsForWorkspace = (workspaceId?: string) => {
  return useLiveQuery(
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
};

/**
 * Custom hook for real-time forms sync.
 */
export const useForms = () => {
  return useLiveQuery((q) =>
    q
      .from({ form: formCollection })
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
  );
};

/**
 * Custom hook for real-time form sync by ID.
 */
export const useForm = (formId?: string) => {
  return useLiveQuery(
    (q) => {
      if (!formId) return undefined;
      return q.from({ form: formCollection }).where(({ form }) => eq(form.id, formId));
    },
    [formId],
  );
};

/**
 * Custom hook for real-time local form draft sync by ID.
 */
export const useLocalForm = (formId?: string) => {
  return useLiveQuery(
    (q) => {
      if (!formId) return undefined;
      return q.from({ doc: localFormCollection }).where(({ doc }) => eq(doc.id, formId));
    },
    [formId],
  );
};

/**
 * Custom hook for real-time favorites sync for current user.
 */
const useFavorites = (userId?: string) => {
  return useLiveQuery(
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
};

/**
 * Check if a specific form is favorited by the user.
 */
export const useIsFavorite = (userId?: string, formId?: string) => {
  const { data: favorites } = useFavorites(userId);
  return useMemo(() => {
    if (!userId || !formId || !favorites) return false;
    return favorites.some((f) => f.formId === formId);
  }, [favorites, userId, formId]);
};

/**
 * Get user's favorite forms with full form data.
 * Uses a join for incremental view maintenance instead of JS filtering.
 */
export const useFavoriteForms = (userId?: string) => {
  const { data } = useLiveQuery(
    (q) => {
      if (!userId) return undefined;
      return q
        .from({ fav: favoriteCollection })
        .innerJoin({ form: formCollection }, ({ fav, form }) =>
          eq(fav.formId, form.id),
        )
        .where(({ fav }) => eq(fav.userId, userId))
        .where(({ form }) =>
          or(eq(form.status, "draft"), eq(form.status, "published")),
        )
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
export const useArchivedForms = () => {
  return useLiveQuery((q) =>
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
};

/**
 * Custom hook for real-time submission counts by formId.
 * Uses groupBy/count for incremental view maintenance.
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
