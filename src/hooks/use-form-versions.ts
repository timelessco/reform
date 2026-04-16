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
 * Flat settings keys that are part of the published version snapshot (Group 2).
 * Group 4 fields (slug, customDomainId, branding) are intentionally excluded —
 * those are live and update the public form immediately without a republish.
 */
const VERSIONED_SETTINGS_KEYS = [
  "progressBar",
  "autoJump",
  "saveAnswersForLater",
  "redirectOnCompletion",
  "redirectUrl",
  "redirectDelay",
  "language",
  "passwordProtect",
  "password",
  "closeForm",
  "closedFormMessage",
  "closeOnDate",
  "closeDate",
  "limitSubmissions",
  "maxSubmissions",
  "preventDuplicateSubmissions",
  "selfEmailNotifications",
  "notificationEmail",
  "respondentEmailNotifications",
  "respondentEmailSubject",
  "respondentEmailBody",
  "dataRetention",
  "dataRetentionDays",
] as const;

const pickSettings = (src: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of VERSIONED_SETTINGS_KEYS) {
    out[key] = src[key] ?? null;
  }
  return out;
};

/**
 * Hook to detect if the current draft has unpublished changes.
 * Compares a single serialized object covering every versioned field
 * (content, customization, title, icon, cover, Group 2 settings) against
 * the latest published version snapshot. Group 4 fields are not compared —
 * they apply to the public form live.
 */
export const useHasUnpublishedChanges = (formId: string | undefined) => {
  const { data: formData } = useForm(formId);
  const { data: versions } = useFormVersions(formId);

  const form = formData?.[0];
  const latestVersionMeta = versions?.[0];

  // Fetch the latest version's full content for comparison
  const { data: versionContentData } = useFormVersionContent(latestVersionMeta?.id);
  const latestVersion = versionContentData?.[0];

  const hasPublished = !!form?.lastPublishedVersionId;

  const currentSnapshotStr = useMemo(() => {
    if (!form) return null;
    const flat = form as unknown as Record<string, unknown>;
    return JSON.stringify({
      content: form.content ?? [],
      customization: form.customization ?? {},
      title: form.title ?? "",
      icon: form.icon ?? null,
      cover: form.cover ?? null,
      settings: pickSettings(flat),
    });
  }, [form]);

  const publishedSnapshotStr = useMemo(() => {
    if (!latestVersion) return null;
    return JSON.stringify({
      content: latestVersion.content ?? [],
      customization: latestVersion.customization ?? {},
      title: latestVersion.title ?? "",
      icon: (latestVersion as unknown as { icon?: string | null }).icon ?? null,
      cover: (latestVersion as unknown as { cover?: string | null }).cover ?? null,
      settings: pickSettings((latestVersion.settings ?? {}) as Record<string, unknown>),
    });
  }, [latestVersion]);

  return useMemo(() => {
    if (!formId || !hasPublished) return false;
    if (!currentSnapshotStr || !publishedSnapshotStr) return false;
    return currentSnapshotStr !== publishedSnapshotStr;
  }, [formId, hasPublished, currentSnapshotStr, publishedSnapshotStr]);
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
 * Discard changes and revert every versioned field (Groups 1–3) on the live
 * draft back to the latest published version snapshot. Group 4 fields (slug,
 * customDomainId, branding) stay as-is — they're live and never versioned.
 */
export const discardChanges = (formId: string) => {
  const detail = getFormListings();
  const form = detail.get(formId);
  if (!form?.lastPublishedVersionId) throw new Error("No published version to revert to");

  const versionCollection = getVersionContent(form.lastPublishedVersionId as string);
  const version = versionCollection.get(form.lastPublishedVersionId as string);
  if (!version) throw new Error("Published version not found in local state");

  const snapshotSettings = (version.settings ?? {}) as Record<string, unknown>;

  const tx = createTransaction({
    mutationFn: async () => {
      await discardFormChanges({ data: { formId } });
      await detail.utils.refetch();
    },
  });

  tx.mutate(() => {
    detail.update(formId, (draft) => {
      // Group 1 — content/appearance
      draft.content = version.content;
      draft.title = version.title ?? "";
      draft.customization = version.customization ?? {};
      // Group 3 — visual assets
      draft.icon = version.icon;
      draft.cover = version.cover;
      // Group 2 — reset every versioned behavior setting to the snapshot value
      for (const key of VERSIONED_SETTINGS_KEYS) {
        (draft as unknown as Record<string, unknown>)[key] = snapshotSettings[key] ?? null;
      }
      draft.updatedAt = new Date().toISOString();
    });
  });

  return tx;
};
