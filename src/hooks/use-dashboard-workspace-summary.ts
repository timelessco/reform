import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDashboardWorkspaceMutationOptions,
  getDashboardWorkspaceSummaryQueryOptions,
} from "@/lib/dashboard-workspace-summary";

export const useDashboardWorkspaceSummary = (activeOrgId?: string) =>
  useQuery({
    ...getDashboardWorkspaceSummaryQueryOptions(activeOrgId),
    enabled: !!activeOrgId,
  });

export const useCreateDashboardWorkspace = (activeOrgId?: string) => {
  const queryClient = useQueryClient();

  return useMutation(createDashboardWorkspaceMutationOptions(queryClient, activeOrgId));
};
