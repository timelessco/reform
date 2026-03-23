import type { QueryClient } from "@tanstack/react-query";
import {
  createFormLocal,
  duplicateFormById,
  updateFormStatus,
} from "@/db-collections/form.collections";
import { deleteWorkspaceLocal, updateWorkspaceName } from "@/db-collections/workspace.collection";
import type { DashboardWorkspaceSummary } from "@/lib/dashboard-workspace-summary";
import { getDashboardWorkspaceSummaryQueryOptions } from "@/lib/dashboard-workspace-summary";
import { createWorkspace } from "@/lib/fn/workspaces";
import { getFormByIdQueryOptions } from "@/lib/fn/forms";
import type { FormNavigationSummary, WorkspaceNavigationSummary } from "@/lib/navigation-sidebar";
import { navigationFormsQueryKey, navigationWorkspacesQueryKey } from "@/lib/navigation-sidebar";

type WorkspaceRecord = WorkspaceNavigationSummary;

type FormRecord = FormNavigationSummary & {
  createdAt?: string;
};

type ClientCommandLayerDeps = {
  archiveForm: (formId: string) => Promise<void>;
  createForm: (workspaceId: string, title?: string) => Promise<FormRecord>;
  createWorkspace: (organizationId: string, name: string) => Promise<WorkspaceRecord>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  duplicateForm: (formId: string) => Promise<FormRecord> | FormRecord;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
};

const defaultDeps: ClientCommandLayerDeps = {
  archiveForm: async (formId: string) => updateFormStatus(formId, "archived"),
  createForm: async (workspaceId: string, title?: string) => createFormLocal(workspaceId, title),
  createWorkspace: async (organizationId: string, name: string) => {
    const result = (await createWorkspace({
      data: {
        organizationId,
        name,
      },
    })) as { workspace: WorkspaceRecord };

    return result.workspace;
  },
  deleteWorkspace: async (workspaceId: string) => deleteWorkspaceLocal(workspaceId),
  duplicateForm: (formId: string) => duplicateFormById(formId),
  renameWorkspace: async (workspaceId: string, name: string) =>
    updateWorkspaceName(workspaceId, name),
};

const toFormNavigationSummary = (form: FormRecord): FormNavigationSummary => ({
  id: form.id,
  title: form.title,
  workspaceId: form.workspaceId,
  status: form.status,
  updatedAt: form.updatedAt,
  icon: form.icon,
  customization: form.customization,
});

const upsertWorkspace = (
  workspaces: WorkspaceNavigationSummary[],
  workspace: WorkspaceNavigationSummary,
) => {
  const withoutExisting = workspaces.filter((current) => current.id !== workspace.id);

  return [workspace, ...withoutExisting];
};

const upsertForm = (forms: FormNavigationSummary[], form: FormNavigationSummary) => {
  const withoutExisting = forms.filter((current) => current.id !== form.id);

  return [form, ...withoutExisting].toSorted((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
};

const removeForm = (forms: FormNavigationSummary[], formId: string) =>
  forms.filter((form) => form.id !== formId);

const removeWorkspace = (workspaces: WorkspaceNavigationSummary[], workspaceId: string) =>
  workspaces.filter((workspace) => workspace.id !== workspaceId);

const renameWorkspaceInList = (
  workspaces: WorkspaceNavigationSummary[],
  workspaceId: string,
  name: string,
) =>
  workspaces.map((workspace) =>
    workspace.id === workspaceId
      ? {
          ...workspace,
          name,
          updatedAt: new Date().toISOString(),
        }
      : workspace,
  );

export const createClientCommandLayer = ({
  activeOrgId,
  deps = defaultDeps,
  queryClient,
}: {
  activeOrgId?: string;
  deps?: ClientCommandLayerDeps;
  queryClient: QueryClient;
}) => {
  const dashboardQueryKey = getDashboardWorkspaceSummaryQueryOptions(activeOrgId).queryKey;

  return {
    createWorkspace: async ({ name }: { name: string }) => {
      if (!activeOrgId) {
        throw new Error("Active organization is required to create a workspace");
      }

      const previousDashboard =
        queryClient.getQueryData<DashboardWorkspaceSummary>(dashboardQueryKey);
      const previousNavigation = queryClient.getQueryData<WorkspaceNavigationSummary[]>(
        navigationWorkspacesQueryKey,
      );
      const optimisticWorkspace: WorkspaceNavigationSummary = {
        id: crypto.randomUUID(),
        organizationId: activeOrgId,
        createdByUserId: "",
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
        workspaces: upsertWorkspace(current?.workspaces ?? [], optimisticWorkspace),
        forms: current?.forms ?? [],
      }));
      queryClient.setQueryData<WorkspaceNavigationSummary[]>(
        navigationWorkspacesQueryKey,
        (current) => upsertWorkspace(current ?? [], optimisticWorkspace),
      );

      try {
        const workspace = await deps.createWorkspace(activeOrgId, name);

        queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
          workspaces: upsertWorkspace(
            (current?.workspaces ?? []).filter(
              (currentWorkspace) => currentWorkspace.id !== optimisticWorkspace.id,
            ),
            workspace,
          ),
          forms: current?.forms ?? [],
        }));
        queryClient.setQueryData<WorkspaceNavigationSummary[]>(
          navigationWorkspacesQueryKey,
          (current) =>
            upsertWorkspace(
              (current ?? []).filter(
                (currentWorkspace) => currentWorkspace.id !== optimisticWorkspace.id,
              ),
              workspace,
            ),
        );

        return workspace;
      } catch (error) {
        queryClient.setQueryData(dashboardQueryKey, previousDashboard);
        queryClient.setQueryData(navigationWorkspacesQueryKey, previousNavigation);
        throw error;
      }
    },
    createForm: async ({ title, workspaceId }: { title?: string; workspaceId: string }) => {
      const form = await deps.createForm(workspaceId, title);
      const formSummary = toFormNavigationSummary(form);

      queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
        workspaces: current?.workspaces ?? [],
        forms: upsertForm(current?.forms ?? [], formSummary),
      }));
      queryClient.setQueryData<FormNavigationSummary[]>(
        navigationFormsQueryKey(activeOrgId),
        (current) => upsertForm(current ?? [], formSummary),
      );
      queryClient.setQueryData(getFormByIdQueryOptions(form.id).queryKey, {
        form,
      });

      return form;
    },
    archiveForm: async ({ formId }: { formId: string }) => {
      const previousDashboard =
        queryClient.getQueryData<DashboardWorkspaceSummary>(dashboardQueryKey);
      const previousNavigation = queryClient.getQueryData<FormNavigationSummary[]>(
        navigationFormsQueryKey(activeOrgId),
      );
      const previousDetail = queryClient.getQueryData<{ form?: FormRecord }>(
        getFormByIdQueryOptions(formId).queryKey,
      );

      queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
        workspaces: current?.workspaces ?? [],
        forms: removeForm(current?.forms ?? [], formId),
      }));
      queryClient.setQueryData<FormNavigationSummary[]>(
        navigationFormsQueryKey(activeOrgId),
        (current) => removeForm(current ?? [], formId),
      );
      queryClient.setQueryData<{ form?: FormRecord }>(
        getFormByIdQueryOptions(formId).queryKey,
        (current) => ({
          form: current?.form ? { ...current.form, status: "archived" } : current?.form,
        }),
      );

      try {
        await deps.archiveForm(formId);
      } catch (error) {
        queryClient.setQueryData(dashboardQueryKey, previousDashboard);
        queryClient.setQueryData(navigationFormsQueryKey(activeOrgId), previousNavigation);
        queryClient.setQueryData(getFormByIdQueryOptions(formId).queryKey, previousDetail);
        throw error;
      }
    },
    renameWorkspace: async ({ name, workspaceId }: { name: string; workspaceId: string }) => {
      const previousDashboard =
        queryClient.getQueryData<DashboardWorkspaceSummary>(dashboardQueryKey);
      const previousNavigation = queryClient.getQueryData<WorkspaceNavigationSummary[]>(
        navigationWorkspacesQueryKey,
      );

      queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
        workspaces: renameWorkspaceInList(current?.workspaces ?? [], workspaceId, name),
        forms: current?.forms ?? [],
      }));
      queryClient.setQueryData<WorkspaceNavigationSummary[]>(
        navigationWorkspacesQueryKey,
        (current) => renameWorkspaceInList(current ?? [], workspaceId, name),
      );

      try {
        await deps.renameWorkspace(workspaceId, name);
      } catch (error) {
        queryClient.setQueryData(dashboardQueryKey, previousDashboard);
        queryClient.setQueryData(navigationWorkspacesQueryKey, previousNavigation);
        throw error;
      }
    },
    deleteWorkspace: async ({ workspaceId }: { workspaceId: string }) => {
      const previousDashboard =
        queryClient.getQueryData<DashboardWorkspaceSummary>(dashboardQueryKey);
      const previousNavigationWorkspaces = queryClient.getQueryData<WorkspaceNavigationSummary[]>(
        navigationWorkspacesQueryKey,
      );
      const previousNavigationForms = queryClient.getQueryData<FormNavigationSummary[]>(
        navigationFormsQueryKey(activeOrgId),
      );

      queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
        workspaces: removeWorkspace(current?.workspaces ?? [], workspaceId),
        forms: (current?.forms ?? []).filter((form) => form.workspaceId !== workspaceId),
      }));
      queryClient.setQueryData<WorkspaceNavigationSummary[]>(
        navigationWorkspacesQueryKey,
        (current) => removeWorkspace(current ?? [], workspaceId),
      );
      queryClient.setQueryData<FormNavigationSummary[]>(
        navigationFormsQueryKey(activeOrgId),
        (current) => (current ?? []).filter((form) => form.workspaceId !== workspaceId),
      );

      try {
        await deps.deleteWorkspace(workspaceId);
      } catch (error) {
        queryClient.setQueryData(dashboardQueryKey, previousDashboard);
        queryClient.setQueryData(navigationWorkspacesQueryKey, previousNavigationWorkspaces);
        queryClient.setQueryData(navigationFormsQueryKey(activeOrgId), previousNavigationForms);
        throw error;
      }
    },
    duplicateForm: async ({ formId }: { formId: string }) => {
      const form = await deps.duplicateForm(formId);
      const duplicatedForm = await Promise.resolve(form);
      const formSummary = toFormNavigationSummary(duplicatedForm);

      queryClient.setQueryData<DashboardWorkspaceSummary>(dashboardQueryKey, (current) => ({
        workspaces: current?.workspaces ?? [],
        forms: upsertForm(current?.forms ?? [], formSummary),
      }));
      queryClient.setQueryData<FormNavigationSummary[]>(
        navigationFormsQueryKey(activeOrgId),
        (current) => upsertForm(current ?? [], formSummary),
      );
      queryClient.setQueryData(getFormByIdQueryOptions(duplicatedForm.id).queryKey, {
        form: duplicatedForm,
      });

      return duplicatedForm;
    },
  };
};
