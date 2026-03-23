import { queryOptions, useQuery } from "@tanstack/react-query";
import { getFormVersions, getFormVersionContent } from "@/lib/fn/form-versions";

export type FormVersionMetadata = {
  id: string;
  version: number;
  title: string;
  publishedAt: string;
  publishedBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  publishedByUserId: string;
};

export type FormVersionContent = {
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
};

export const formVersionsQueryKey = (formId: string) => ["form-versions", formId] as const;

export const formVersionContentQueryKey = (versionId: string) =>
  ["form-version-content", versionId] as const;

export const getFormVersionsQueryOptions = (formId: string) =>
  queryOptions({
    queryKey: formVersionsQueryKey(formId),
    queryFn: async () => {
      const result = (await getFormVersions({ data: { formId } })) as {
        versions: FormVersionMetadata[];
      };

      return result.versions;
    },
    staleTime: 1000 * 60 * 5,
  });

export const getFormVersionContentQueryOptions = (versionId: string) =>
  queryOptions({
    queryKey: formVersionContentQueryKey(versionId),
    queryFn: async () => {
      const result = (await getFormVersionContent({ data: { versionId } })) as {
        version: FormVersionContent;
      };

      return result.version;
    },
    staleTime: 1000 * 60 * 5,
  });

export const useFormVersionList = (formId: string | undefined) =>
  useQuery(
    formId ? getFormVersionsQueryOptions(formId) : queryOptions({ queryKey: [], enabled: false }),
  );

export const useFormVersionContent = (versionId: string | undefined) =>
  useQuery(
    versionId
      ? getFormVersionContentQueryOptions(versionId)
      : queryOptions({ queryKey: [], enabled: false }),
  );
