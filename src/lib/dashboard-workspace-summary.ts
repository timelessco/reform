import type { QueryClient } from "@tanstack/react-query";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createWorkspace, getWorkspacesWithForms } from "@/lib/fn/workspaces";

type WorkspaceSummary = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type FormSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
  workspaceId: string;
};

type WorkspaceWithForms = WorkspaceSummary & {
  forms: FormSummary[];
};

export type DashboardWorkspaceSummary = {
  workspaces: WorkspaceSummary[];
  forms: FormSummary[];
};

type CreateDashboardWorkspaceVariables = {
  name: string;
};

type CreateWorkspaceResult = {
  workspace: WorkspaceSummary;
};

type CreateDashboardWorkspaceContext = {
  previousSummary?: DashboardWorkspaceSummary;
  optimisticWorkspaceId: string;
};

const EMPTY_DASHBOARD_SUMMARY: DashboardWorkspaceSummary = {
  workspaces: [],
  forms: [],
};

const toDashboardWorkspaceSummary = (
  activeOrgId: string | undefined,
  workspaces: WorkspaceWithForms[],
): DashboardWorkspaceSummary => {
  if (!activeOrgId) {
    return EMPTY_DASHBOARD_SUMMARY;
  }

  const activeWorkspaces = workspaces.filter(
    (workspace) => workspace.organizationId === activeOrgId,
  );

  return {
    workspaces: activeWorkspaces.map(({ forms: _forms, ...workspace }) => workspace),
    forms: activeWorkspaces
      .flatMap((workspace) => workspace.forms)
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
};

export const getDashboardWorkspaceSummaryQueryOptions = (activeOrgId?: string) =>
  queryOptions({
    queryKey: ["dashboard-workspace-summary", activeOrgId],
    queryFn: async () => {
      const result = (await getWorkspacesWithForms()) as { workspaces: WorkspaceWithForms[] };
      return toDashboardWorkspaceSummary(activeOrgId, result.workspaces);
    },
    staleTime: 1000 * 60 * 5,
  });

export const createDashboardWorkspaceMutationOptions = (
  queryClient: QueryClient,
  activeOrgId?: string,
) =>
  mutationOptions({
    mutationKey: ["dashboard-workspace-summary", activeOrgId, "create-workspace"],
    mutationFn: async ({ name }: CreateDashboardWorkspaceVariables) => {
      if (!activeOrgId) {
        throw new Error("Active organization is required to create a workspace");
      }

      return (await createWorkspace({
        data: {
          organizationId: activeOrgId,
          name,
        },
      })) as CreateWorkspaceResult;
    },
    onMutate: async ({ name }: CreateDashboardWorkspaceVariables) => {
      const queryKey = getDashboardWorkspaceSummaryQueryOptions(activeOrgId).queryKey;
      await queryClient.cancelQueries({ queryKey });
      const previousSummary = queryClient.getQueryData<DashboardWorkspaceSummary>(queryKey);
      const optimisticWorkspaceId = crypto.randomUUID();
      const now = new Date().toISOString();

      queryClient.setQueryData<DashboardWorkspaceSummary>(queryKey, (currentSummary) => ({
        workspaces: [
          {
            id: optimisticWorkspaceId,
            organizationId: activeOrgId ?? "",
            createdByUserId: "",
            name,
            createdAt: now,
            updatedAt: now,
          },
          ...(currentSummary?.workspaces ?? []),
        ],
        forms: currentSummary?.forms ?? [],
      }));

      return {
        previousSummary,
        optimisticWorkspaceId,
      } satisfies CreateDashboardWorkspaceContext;
    },
    onSuccess: async (result, _variables, context) => {
      const queryKey = getDashboardWorkspaceSummaryQueryOptions(activeOrgId).queryKey;

      queryClient.setQueryData<DashboardWorkspaceSummary>(queryKey, (currentSummary) => ({
        workspaces: (currentSummary?.workspaces ?? []).map((workspace) =>
          workspace.id === context.optimisticWorkspaceId ? result.workspace : workspace,
        ),
        forms: currentSummary?.forms ?? [],
      }));
    },
    onError: async (_error, _variables, context) => {
      const queryKey = getDashboardWorkspaceSummaryQueryOptions(activeOrgId).queryKey;

      queryClient.setQueryData(queryKey, context.previousSummary);
    },
    onSettled: async () => {
      const queryKey = getDashboardWorkspaceSummaryQueryOptions(activeOrgId).queryKey;
      await queryClient.invalidateQueries({ queryKey });
    },
  });
