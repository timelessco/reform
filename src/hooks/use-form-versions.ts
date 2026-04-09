import { createTransaction, eq, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import {
  isInitialized,
  getFormListings,
  getVersionList,
  getVersionContent,
  getQueryClient,
} from "@/collections";
import {
  discardFormChanges,
  publishFormVersion,
  restoreFormVersion,
} from "@/lib/server-fn/form-versions";
import { useForm } from "./use-live-hooks";

/**
 * Hook to get list of published versions for a form (query-backed)
 */
export const useFormVersions = (formId: string | undefined) =>
  useLiveQuery(
    (q) => {
      if (!formId || !isInitialized()) return undefined;
      return q.from({ v: getVersionList(formId) }).orderBy(({ v }) => v.version, "desc");
    },
    [formId],
  );

/**
 * Hook to get full content of a specific version (query-backed)
 */
export const useFormVersionContent = (versionId: string | undefined) =>
  useLiveQuery(
    (q) => {
      if (!versionId || !isInitialized()) return undefined;
      return q.from({ v: getVersionContent(versionId) }).where(({ v }) => eq(v.id, versionId));
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

  const form = formData?.[0];
  const latestVersionMeta = versions?.[0];

  // Fetch the latest version's full content for comparison
  const { data: versionContentData } = useFormVersionContent(latestVersionMeta?.id);
  const latestVersionContent = versionContentData?.[0];

  const hasPublished = !!form?.lastPublishedVersionId;
  const publishedContentHash = form?.publishedContentHash;
  const currentContentStr = form ? JSON.stringify(form.content) : null;
  const publishedContentStr = latestVersionContent
    ? JSON.stringify(latestVersionContent.content)
    : null;
  const currentCustomizationStr = form ? JSON.stringify(form.customization ?? {}) : null;
  const publishedCustomizationStr = latestVersionContent
    ? JSON.stringify(latestVersionContent.customization ?? {})
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
// On success the overlay is confirmed; query invalidation syncs the real data.
// On error the transaction auto-rolls back the optimistic state.
// ============================================================================

/**
 * Publish the current form draft. Optimistically sets status to "published".
 */
export const publishForm = (formId: string) => {
  const queryClient = getQueryClient();
  const tx = createTransaction({
    mutationFn: async () => {
      const result = await publishFormVersion({ data: { formId } });
      // Pre-populate version content cache so useHasUnpublishedChanges
      // can compare immediately without waiting for a separate fetch
      if (result?.version) {
        queryClient.setQueryData(["form-version-content", result.version.id], [result.version]);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["form-versions", formId] }),
        getFormListings().utils.refetch(),
      ]);
    },
  });

  tx.mutate(() => {
    getFormListings().update(formId, (draft) => {
      draft.status = "published";
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
};

/**
 * Restore a version's content to the form draft.
 * Bypasses createTransaction to avoid optimistic overlay timing issues —
 * calls the server API, then uses writeUpdate to synchronously update
 * the collection's sync store so the editor picks up restored content
 * immediately when exiting version view.
 */
export const restoreVersion = async (formId: string, versionId: string) => {
  const versionCollection = getVersionContent(versionId);
  const version = versionCollection.get(versionId);
  if (!version) throw new Error("Version not found in local state");

  // Persist to server
  await restoreFormVersion({ data: { formId, versionId } });

  // Directly write restored data to the sync store (synchronous, no optimistic overlay)
  const detail = getFormListings();
  const currentForm = detail.get(formId);
  if (currentForm) {
    detail.utils.writeUpdate({
      ...currentForm,
      content: version.content,
      title: version.title,
      customization: version.customization ?? {},
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Discard changes and revert to last published version.
 * Optimistically updates content/title/customization from the published version.
 */
export const discardChanges = (formId: string) => {
  const detail = getFormListings();
  const form = detail.get(formId);
  if (!form?.lastPublishedVersionId) throw new Error("No published version to revert to");

  const versionCollection = getVersionContent(form.lastPublishedVersionId as string);
  const version = versionCollection.get(form.lastPublishedVersionId as string);
  if (!version) throw new Error("Published version not found in local state");

  const tx = createTransaction({
    mutationFn: async () => {
      await discardFormChanges({ data: { formId } });
      await detail.utils.refetch();
    },
  });

  tx.mutate(() => {
    detail.update(formId, (draft) => {
      draft.content = version.content;
      draft.title = version.title;
      draft.customization = version.customization ?? {};
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
};
