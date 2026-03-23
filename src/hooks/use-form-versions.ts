import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formCollection } from "@/db-collections/form.collections";
import { discardFormChanges, publishFormVersion, restoreFormVersion } from "@/lib/fn/form-versions";
import { getFormByIdQueryOptions } from "@/lib/fn/forms";
import {
  formVersionsQueryKey,
  formVersionContentQueryKey,
  useFormVersionList,
  useFormVersionContent as useFormVersionContentQuery,
} from "@/lib/form-versions-query";
import type { FormVersionMetadata } from "@/lib/form-versions-query";
import { useForm } from "./use-live-hooks";

export { useFormVersionList, useFormVersionContent };

export const useFormVersions = (formId: string | undefined) => useFormVersionList(formId);

export const useFormVersionContent = (versionId: string | undefined) => {
  const result = useFormVersionContentQuery(versionId);
  return { ...result, data: result.data ? [result.data] : undefined };
};

export const useHasUnpublishedChanges = (formId: string | undefined) => {
  const { data: formData } = useForm(formId);
  const { data: versions } = useFormVersionList(formId);

  const form = formData?.[0];
  const latestVersion = versions?.[0];

  const hasPublished = !!form?.lastPublishedVersionId;
  const publishedContentHash = form?.publishedContentHash;
  const currentContentStr = form ? JSON.stringify(form.content) : null;
  const publishedContentStr = latestVersion ? JSON.stringify(latestVersion.content) : null;
  const currentCustomizationStr = form ? JSON.stringify(form.customization ?? {}) : null;
  const publishedCustomizationStr = latestVersion
    ? JSON.stringify(latestVersion.customization ?? {})
    : null;

  if (!formId || !publishedContentHash || !hasPublished) return false;
  if (!publishedContentStr) return false;
  if (currentContentStr !== publishedContentStr) return true;
  return currentCustomizationStr !== publishedCustomizationStr;
};

export const usePublishForm = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (formId: string) => {
      const optimisticVersion: FormVersionMetadata = {
        id: crypto.randomUUID(),
        version: Date.now(),
        title: "Publishing...",
        publishedAt: new Date().toISOString(),
        publishedBy: { id: "", name: null, image: null },
      };

      queryClient.setQueryData<FormVersionMetadata[]>(formVersionsQueryKey(formId), (current) => [
        optimisticVersion,
        ...(current ?? []),
      ]);

      try {
        const result = (await publishFormVersion({ data: { formId } })) as {
          version: FormVersionMetadata;
          versionNumber: number;
          txid: number;
        };

        queryClient.setQueryData<FormVersionMetadata[]>(formVersionsQueryKey(formId), (current) => {
          const withoutOptimistic = (current ?? []).filter((v) => v.id !== optimisticVersion.id);
          return [result.version, ...withoutOptimistic];
        });

        formCollection.update(formId, (draft) => {
          draft.status = "published";
          draft.updatedAt = new Date().toISOString();
        });

        queryClient.invalidateQueries({ queryKey: getFormByIdQueryOptions(formId).queryKey });

        return result;
      } catch (error) {
        queryClient.setQueryData<FormVersionMetadata[]>(formVersionsQueryKey(formId), (current) =>
          (current ?? []).filter((v) => v.id !== optimisticVersion.id),
        );
        throw error;
      }
    },
    [queryClient],
  );
};

export const useRestoreVersion = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (formId: string, versionId: string) => {
      const versionContent = queryClient.getQueryData<{
        id: string;
        formId: string;
        version: number;
        title: string;
        content: object[];
        settings: Record<string, object>;
        customization: Record<string, string>;
        publishedAt: string;
        publishedByUserId: string;
        createdAt: string;
      }>(formVersionContentQueryKey(versionId));

      if (!versionContent) {
        throw new Error("Version content not found");
      }

      const result = (await restoreFormVersion({ data: { formId, versionId } })) as {
        success: boolean;
        txid: number;
        version: { content: object[]; settings: Record<string, object>; title: string };
      };

      formCollection.update(formId, (draft) => {
        draft.content = versionContent.content as Record<string, object>;
        draft.title = versionContent.title;
        draft.customization = versionContent.customization;
        draft.updatedAt = new Date().toISOString();
      });

      queryClient.invalidateQueries({ queryKey: getFormByIdQueryOptions(formId).queryKey });

      return result;
    },
    [queryClient],
  );
};

export const useDiscardChanges = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (formId: string) => {
      const form = formCollection.state.get(formId);
      if (!form?.lastPublishedVersionId) {
        throw new Error("No published version to revert to");
      }

      const versionContent = queryClient.getQueryData<{
        id: string;
        formId: string;
        version: number;
        title: string;
        content: object[];
        settings: Record<string, object>;
        customization: Record<string, string>;
        publishedAt: string;
        publishedByUserId: string;
        createdAt: string;
      }>(formVersionContentQueryKey(form.lastPublishedVersionId));

      if (!versionContent) {
        throw new Error("Published version content not found");
      }

      const result = (await discardFormChanges({ data: { formId } })) as {
        success: boolean;
        txid: number;
        version: { content: object[]; settings: Record<string, object>; title: string };
      };

      formCollection.update(formId, (draft) => {
        draft.content = versionContent.content as Record<string, object>;
        draft.title = versionContent.title;
        draft.customization = versionContent.customization;
        draft.updatedAt = new Date().toISOString();
      });

      queryClient.invalidateQueries({ queryKey: getFormByIdQueryOptions(formId).queryKey });

      return result;
    },
    [queryClient],
  );
};

export const _publishForm = async (_formId: string) => {
  throw new Error("usePublishForm hook must be used within a React context");
};

export const _restoreVersion = async (_formId: string, _versionId: string) => {
  throw new Error("useRestoreVersion hook must be used within a React context");
};

export const _discardChanges = async (_formId: string) => {
  throw new Error("useDiscardChanges hook must be used within a React context");
};
