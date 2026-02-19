import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { formCollection, formVersionCollection } from "@/db-collections";
import { discardFormChanges, publishFormVersion, restoreFormVersion } from "@/lib/fn/form-versions";
import { useForm } from "./use-live-hooks";

/**
 * Hook to get list of published versions for a form (Electric-synced)
 */
export function useFormVersions(formId: string | undefined) {
  return useLiveQuery(
    (q) => {
      if (!formId) return null as any;
      return q
        .from({ v: formVersionCollection })
        .where(({ v }) => eq(v.formId, formId))
        .orderBy(({ v }) => v.version, "desc");
    },
    [formId],
  );
}

/**
 * Hook to get full content of a specific version (Electric-synced)
 */
export function useFormVersionContent(versionId: string | undefined) {
  return useLiveQuery(
    (q) => {
      if (!versionId) return null as any;
      return q.from({ v: formVersionCollection }).where(({ v }) => eq(v.id, versionId));
    },
    [versionId],
  );
}

/**
 * Hook to detect if the current draft has unpublished changes.
 * Compares current content with the latest published version.
 */
export function useHasUnpublishedChanges(formId: string | undefined) {
  const { data: formData } = useForm(formId);
  const { data: versions } = useFormVersions(formId);

  const form = useMemo(() => {
    if (!formId || !formData) return undefined;
    return formData.find((f: any) => f.id === formId);
  }, [formData, formId]);

  const latestVersion = versions?.[0];

  return useMemo(() => {
    if (!form) return false;

    // If form was never published (no versions), no "unpublished changes"
    if (!latestVersion) return false;

    // Compare current content with published version content
    // formVersionCollection already has full content via Electric sync
    const currentContent = JSON.stringify(form.content);
    const publishedContent = JSON.stringify(latestVersion.content);

    return currentContent !== publishedContent;
  }, [form, latestVersion]);
}

// ============================================================================
// Optimistic Actions (replace useMutation hooks)
// ============================================================================

export const publishFormAction = createOptimisticAction<{ formId: string }>({
  onMutate: ({ formId }) => {
    formCollection.update(formId, (draft) => {
      draft.status = "published";
    });
  },
  mutationFn: async ({ formId }) => {
    return await publishFormVersion({ data: { formId } });
  },
});

export const restoreVersionAction = createOptimisticAction<{
  formId: string;
  versionId: string;
}>({
  onMutate: () => {
    // No optimistic update — Electric syncs content back
  },
  mutationFn: async ({ formId, versionId }) => {
    return await restoreFormVersion({ data: { formId, versionId } });
  },
});

export const discardChangesAction = createOptimisticAction<{ formId: string }>({
  onMutate: () => {
    // No optimistic update — Electric syncs content back
  },
  mutationFn: async ({ formId }) => {
    return await discardFormChanges({ data: { formId } });
  },
});
