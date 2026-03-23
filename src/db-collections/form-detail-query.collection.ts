import { createCollection } from "@tanstack/db";
import type { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export type FormDetail = {
  id: string;
  title: string | null;
  status: string;
  workspaceId: string;
  content: unknown[];
  settings?: Record<string, unknown>;
  customization?: Record<string, unknown>;
  formName: string;
  schemaName?: string | null;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  [key: string]: unknown; // Allow additional form fields (cover, isMultiStep, etc.)
};

type MutationHandler = (params: Record<string, unknown>) => Promise<unknown>;

type FormDetailCollectionConfig = {
  queryClient: QueryClient;
  formId: string;
  queryFn: () => Promise<FormDetail | null>;
  onUpdate?: MutationHandler;
};

export const createFormDetailCollection = (config: FormDetailCollectionConfig) => {
  const { queryClient, formId, queryFn, onUpdate } = config;

  return createCollection(
    queryCollectionOptions<FormDetail, unknown, string[], string | number>({
      queryKey: ["form-detail", formId],
      queryFn: async () => {
        const result = await queryFn();
        return result ? [result] : [];
      },
      queryClient,
      getKey: (item): string | number => item.id,
      staleTime: 1000 * 60 * 10, // 10 minutes — cache for status-aware routing
      onUpdate,
    }),
  );
};

/** Determine the route destination based on form status */
export type RouteDecision = "editor" | "submissions" | "archived" | "not-found";

export const resolveFormRoute = (status: string | undefined): RouteDecision => {
  switch (status) {
    case "draft":
      return "editor";
    case "published":
      return "submissions";
    case "archived":
      return "archived";
    default:
      return "not-found";
  }
};
