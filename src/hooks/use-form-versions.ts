import { createTransaction, eq, useLiveQuery } from "@tanstack/react-db";
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
// Optimistic action functions using createTransaction
// Applies optimistic state instantly, then calls server fn in mutationFn.
// Collection's onUpdate does NOT fire because mutations are owned by the tx.
// On success the overlay is confirmed; Electric syncs the real data seamlessly.
// On error the transaction auto-rolls back the optimistic state.
// ============================================================================

/**
 * Publish the current form draft. Optimistically sets status to "published".
 */
export function publishForm(formId: string) {
  const tx = createTransaction({
    mutationFn: async () => {
      await publishFormVersion({ data: { formId } });
    },
  });

  tx.mutate(() => {
    formCollection.update(formId, (draft) => {
      draft.status = "published";
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
}

/**
 * Restore a version's content to the form draft.
 * Optimistically updates content/title from the local version data.
 */
export function restoreVersion(formId: string, versionId: string) {
  const version = formVersionCollection.state.get(versionId);
  if (!version) throw new Error("Version not found in local state");

  const tx = createTransaction({
    mutationFn: async () => {
      await restoreFormVersion({ data: { formId, versionId } });
    },
  });

  tx.mutate(() => {
    formCollection.update(formId, (draft) => {
      draft.content = version.content;
      draft.title = version.title;
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
}

/**
 * Discard changes and revert to last published version.
 * Optimistically updates content/title from the published version.
 */
export function discardChanges(formId: string) {
  const form = formCollection.state.get(formId);
  if (!form?.lastPublishedVersionId) throw new Error("No published version to revert to");

  const version = formVersionCollection.state.get(form.lastPublishedVersionId);
  if (!version) throw new Error("Published version not found in local state");

  const tx = createTransaction({
    mutationFn: async () => {
      await discardFormChanges({ data: { formId } });
    },
  });

  tx.mutate(() => {
    formCollection.update(formId, (draft) => {
      draft.content = version.content;
      draft.title = version.title;
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
}
