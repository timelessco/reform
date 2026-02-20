import { eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { formVersionCollection } from "@/db-collections";
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

    // Never published — no "unpublished changes" indicator
    if (!form.lastPublishedVersionId) return false;

    // Published but version collection hasn't synced yet — can't compare
    if (!latestVersion) return false;

    // Compare current content with published version content
    const currentContent = JSON.stringify(form.content);
    const publishedContent = JSON.stringify(latestVersion.content);

    return currentContent !== publishedContent;
  }, [form, latestVersion]);
}

// ============================================================================
// Direct server function wrappers
// createOptimisticAction with empty onMutate skips mutationFn entirely,
// so we call server functions directly instead.
// Electric syncs the changes back to collections automatically.
// ============================================================================

export { publishFormVersion, restoreFormVersion, discardFormChanges };
