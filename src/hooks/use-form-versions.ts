import { createTransaction, eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import { formCollection } from "@/db-collections/form.collections";
import { formVersionCollection } from "@/db-collections/form-version.collection";
import { discardFormChanges, publishFormVersion, restoreFormVersion } from "@/lib/fn/form-versions";
import { useForm } from "./use-live-hooks";

/**
 * Hook to get list of published versions for a form (Electric-synced)
 */
export const useFormVersions = (formId: string | undefined) =>
  useLiveQuery(
    (q) => {
      if (!formId) return undefined;
      return q
        .from({ v: formVersionCollection })
        .where(({ v }) => eq(v.formId, formId))
        .orderBy(({ v }) => v.version, "desc");
    },
    [formId],
  );

/**
 * Hook to get full content of a specific version (Electric-synced)
 */
export const useFormVersionContent = (versionId: string | undefined) =>
  useLiveQuery(
    (q) => {
      if (!versionId) return undefined;
      return q.from({ v: formVersionCollection }).where(({ v }) => eq(v.id, versionId));
    },
    [versionId],
  );

/**
 * Hook to detect if the current draft has unpublished changes.
 * Compares current content hash with the last published hash.
 */
export const useHasUnpublishedChanges = (formId: string | undefined) => {
  const { data: formData } = useForm(formId);
  const { data: versions } = useFormVersions(formId);

  // useForm already filters by formId via .where(eq(form.id, formId)),
  // so the result is at most one item — no need for JS .find().
  const form = formData?.[0];

  const latestVersion = versions?.[0];

  // Use primitive deps to avoid re-computing on every live query object ref change
  const hasPublished = !!form?.lastPublishedVersionId;
  const publishedContentHash = form?.publishedContentHash;
  const currentContentStr = form ? JSON.stringify(form.content) : null;
  const publishedContentStr = latestVersion ? JSON.stringify(latestVersion.content) : null;
  const currentCustomizationStr = form ? JSON.stringify(form.customization ?? {}) : null;
  const publishedCustomizationStr = latestVersion
    ? JSON.stringify(latestVersion.customization ?? {})
    : null;

  return useMemo(() => {
    if (!formId || !publishedContentHash || !hasPublished) return false;
    if (!publishedContentStr) return false;
    if (currentContentStr !== publishedContentStr) return true;
    return currentCustomizationStr !== publishedCustomizationStr;
  }, [
    formId,
    publishedContentHash,
    hasPublished,
    currentContentStr,
    publishedContentStr,
    currentCustomizationStr,
    publishedCustomizationStr,
  ]);
};

// ============================================================================
// Optimistic action functions using createTransaction
// Applies optimistic state instantly, then calls server fn in mutationFn.
// Collection's onUpdate does NOT fire because mutations are owned by the tx.
// On success the overlay is confirmed; Electric syncs the real data seamlessly.
// On error the transaction auto-rolls back the optimistic state.
// ============================================================================

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
export const publishForm = (formId: string) => {
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
};

/**
 * Restore a version's content to the form draft.
 * Optimistically updates content/title/customization from the local version data.
 */
export const restoreVersion = (formId: string, versionId: string) => {
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
      draft.customization = version.customization ?? {};
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
};

/**
 * Discard changes and revert to last published version.
 * Optimistically updates content/title/customization from the published version.
 */
export const discardChanges = (formId: string) => {
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
      draft.customization = version.customization ?? {};
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
};
