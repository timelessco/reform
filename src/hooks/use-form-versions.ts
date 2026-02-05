import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  discardFormChanges,
  getFormVersionContent,
  getFormVersions,
  publishFormVersion,
  restoreFormVersion,
} from "@/lib/fn/form-versions";
import { useForm } from "./use-live-hooks";

// Type for version content returned by getFormVersionContent
type VersionContent = {
  version: {
    id: string;
    formId: string;
    version: number;
    content: object[];
    settings: Record<string, object>;
    title: string;
    publishedByUserId: string;
    publishedAt: string;
    createdAt: string;
  };
};

/**
 * Hook to get list of published versions for a form
 */
export function useFormVersions(formId: string | undefined) {
  return useQuery({
    queryKey: ["formVersions", formId],
    queryFn: () => getFormVersions({ data: { formId: formId! } }),
    enabled: !!formId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get full content of a specific version
 */
export function useFormVersionContent(versionId: string | undefined) {
  return useQuery<VersionContent>({
    queryKey: ["formVersionContent", versionId],
    queryFn: async () => {
      const result = await getFormVersionContent({
        data: { versionId: versionId! },
      });
      return result as VersionContent;
    },
    enabled: !!versionId,
    staleTime: 1000 * 60 * 10, // 10 minutes (versions are immutable)
  });
}

/**
 * Hook to publish the current form draft as a new version
 */
export function usePublishVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => publishFormVersion({ data: { formId } }),
    onSuccess: (_, formId) => {
      // Invalidate versions list and all version content (new version needs fresh fetch)
      queryClient.invalidateQueries({ queryKey: ["formVersions", formId] });
      queryClient.invalidateQueries({ queryKey: ["formVersionContent"] });
    },
  });
}

/**
 * Hook to restore a version's content to the form draft
 */
export function useRestoreVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, versionId }: { formId: string; versionId: string }) =>
      restoreFormVersion({ data: { formId, versionId } }),
    onSuccess: (_, { formId }) => {
      // The form content will be updated via Electric sync
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ["forms", formId] });
    },
  });
}

/**
 * Hook to discard all changes and revert to last published version
 */
export function useDiscardChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formId: string) => discardFormChanges({ data: { formId } }),
    onSuccess: (_, formId) => {
      // The form content will be updated via Electric sync
      queryClient.invalidateQueries({ queryKey: ["forms", formId] });
    },
  });
}

/**
 * Hook to detect if the current draft has unpublished changes
 * Compares current content with the latest published version
 */
export function useHasUnpublishedChanges(formId: string | undefined) {
  const { data: formData } = useForm(formId);
  const { data: versionsData } = useFormVersions(formId);
  const form = useMemo(() => {
    if (!formId || !formData) return undefined;
    return formData.find((f: any) => f.id === formId);
  }, [formData, formId]);
  const latestVersion = versionsData?.versions?.[0];

  // Get the latest version content for comparison
  const { data: versionContent } = useFormVersionContent(latestVersion?.id);

  return useMemo(() => {
    if (!form) return false;

    // If form was never published (no versions), no "unpublished changes"
    if (!latestVersion) {
      return false;
    }

    // If we don't have version content yet, assume no changes
    if (!versionContent?.version) {
      return false;
    }

    // Compare current content with published version content
    const currentContent = JSON.stringify(form.content);
    const publishedContent = JSON.stringify(versionContent.version.content);

    return currentContent !== publishedContent;
  }, [form, latestVersion, versionContent]);
}

/**
 * Hook to get the current form's version info
 */
export function useFormVersionInfo(formId: string | undefined) {
  const { data: versionsData, isLoading } = useFormVersions(formId);
  const hasChanges = useHasUnpublishedChanges(formId);

  const latestVersion = versionsData?.versions?.[0];
  const versionCount = versionsData?.versions?.length ?? 0;

  return {
    latestVersion,
    versionCount,
    hasUnpublishedChanges: hasChanges,
    isLoading,
  };
}
