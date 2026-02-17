import { eq, or, useLiveQuery } from "@tanstack/react-db";
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
  const result = useLiveQuery((q) => {
    let query = q.from({ ws: workspaceCollection });
    if (workspaceId) {
      query = query.where(({ ws }) => eq(ws.id, workspaceId));
    }
    return query.select(({ ws }) => ({
      id: ws.id,
      organizationId: ws.organizationId,
      createdByUserId: ws.createdByUserId,
      name: ws.name,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    }));
  }, [workspaceId]);
  return { ...result, data: result.data?.[0] };
};

/**
 * Custom hook for real-time forms sync filtered by workspace ID.
 */
export const useFormsForWorkspace = (workspaceId?: string) => {
  return useLiveQuery((q) => {
    let query = q.from({ form: formCollection });
    if (workspaceId) {
      query = query.where(({ form }) => eq(form.workspaceId, workspaceId));
    }
    // Only fetch forms that are not archived
    query = query.where(({ form }) => or(eq(form.status, "draft"), eq(form.status, "published")));

    return query.select(({ form }) => ({
      id: form.id,
      title: form.title,
      workspaceId: form.workspaceId,
      status: form.status,
      updatedAt: form.updatedAt,
    }));
  }, [workspaceId]);
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
      })),
  );
};

/**
 * Custom hook for real-time form sync by ID.
 */
export const useForm = (formId?: string) => {
  return useLiveQuery((q) => {
    if (!formId) return null as any;
    return q.from({ form: formCollection }).where(({ form }) => eq(form.id, formId));
  }, [formId]);
};

/**
 * Custom hook for real-time local form draft sync by ID.
 */
export const useLocalForm = (formId?: string) => {
  return useLiveQuery((q) => {
    if (!formId) return null as any;
    return q.from({ doc: localFormCollection }).where(({ doc }) => eq(doc.id, formId));
  }, [formId]);
};

/**
 * Custom hook for real-time favorites sync for current user.
 */
const useFavorites = (userId?: string) => {
  return useLiveQuery((q) => {
    let query = q.from({ fav: favoriteCollection });
    if (userId) {
      query = query.where(({ fav }) => eq(fav.userId, userId));
    }
    return query.select(({ fav }) => ({
      id: fav.id,
      userId: fav.userId,
      formId: fav.formId,
      createdAt: fav.createdAt,
    }));
  }, [userId]);
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
 */
export const useFavoriteForms = (userId?: string) => {
  const { data: favorites } = useFavorites(userId);
  const { data: allForms } = useForms();

  return useMemo(() => {
    if (!favorites || !allForms) return [];
    const favoriteIds = new Set(favorites.map((f) => f.formId));
    return allForms.filter((form) => favoriteIds.has(form.id));
  }, [favorites, allForms]);
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
 * Returns a Map<formId, count> for efficient lookups.
 */
export const useSubmissionCounts = () => {
  const { data: submissions } = useLiveQuery((q) =>
    q.from({ sub: submissionCollection }).select(({ sub }) => ({
      formId: sub.formId,
    })),
  );

  return useMemo(() => {
    if (!submissions) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const sub of submissions) {
      counts.set(sub.formId, (counts.get(sub.formId) || 0) + 1);
    }
    return counts;
  }, [submissions]);
};
