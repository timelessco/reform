import { createCollection } from "@tanstack/db";
import type { QueryClient } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export type FormSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
  workspaceId: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  organizationId: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  forms: FormSummary[];
};

type MutationHandler = (params: Record<string, unknown>) => Promise<unknown>;

type WorkspaceSummaryCollectionConfig = {
  queryClient: QueryClient;
  /** Server function to fetch workspaces with forms. Injected for testability. */
  queryFn: () => Promise<{ workspaces: WorkspaceSummary[] }>;
  onInsert?: MutationHandler;
  onUpdate?: MutationHandler;
  onDelete?: MutationHandler;
};

export const createWorkspaceSummaryCollection = (config: WorkspaceSummaryCollectionConfig) => {
  const { queryClient, queryFn, onInsert, onUpdate, onDelete } = config;

  return createCollection(
    queryCollectionOptions<WorkspaceSummary, unknown, string[], string | number>({
      queryKey: ["workspaces-with-forms"],
      queryFn: async () => {
        const result = await queryFn();
        return result.workspaces;
      },
      queryClient,
      getKey: (item): string | number => item.id,
      onInsert,
      onUpdate,
      onDelete,
    }),
  );
};
