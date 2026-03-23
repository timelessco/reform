import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const getWorkspacesWithForms = vi.fn();
const createWorkspace = vi.fn();

vi.mock<typeof import("@/lib/fn/workspaces")>("@/lib/fn/workspaces", () => ({
  getWorkspacesWithForms,
  createWorkspace,
}));

describe("getDashboardWorkspaceSummaryQueryOptions", () => {
  it("returns only the active organization workspace summaries and forms", async () => {
    getWorkspacesWithForms.mockReset();
    createWorkspace.mockReset();

    const { getDashboardWorkspaceSummaryQueryOptions } =
      await import("./dashboard-workspace-summary");

    getWorkspacesWithForms.mockResolvedValue({
      workspaces: [
        {
          id: "workspace-1",
          name: "Alpha",
          organizationId: "org-1",
          createdByUserId: "user-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
          forms: [
            {
              id: "form-1",
              title: "Form A",
              updatedAt: "2024-01-03T00:00:00.000Z",
              workspaceId: "workspace-1",
            },
          ],
        },
        {
          id: "workspace-2",
          name: "Beta",
          organizationId: "org-2",
          createdByUserId: "user-2",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-04T00:00:00.000Z",
          forms: [
            {
              id: "form-2",
              title: "Form B",
              updatedAt: "2024-01-04T00:00:00.000Z",
              workspaceId: "workspace-2",
            },
          ],
        },
      ],
    });

    const queryClient = new QueryClient();

    const summary = await queryClient.fetchQuery(getDashboardWorkspaceSummaryQueryOptions("org-1"));

    expect(summary).toMatchObject({
      workspaces: [
        {
          id: "workspace-1",
          organizationId: "org-1",
          name: "Alpha",
        },
      ],
      forms: [
        {
          id: "form-1",
          workspaceId: "workspace-1",
          title: "Form A",
        },
      ],
    });
  });

  it("adds an optimistic workspace summary immediately while create is pending", async () => {
    getWorkspacesWithForms.mockReset();
    createWorkspace.mockReset();

    const { createDashboardWorkspaceMutationOptions } =
      await import("./dashboard-workspace-summary");

    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [],
      forms: [],
    });

    const options = createDashboardWorkspaceMutationOptions(queryClient, "org-1");
    await options.onMutate?.({ name: "New Collection" });

    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      workspaces: [
        {
          organizationId: "org-1",
          name: "New Collection",
        },
      ],
      forms: [],
    });
  });

  it("reconciles the optimistic workspace with the server result after create succeeds", async () => {
    getWorkspacesWithForms.mockReset();
    createWorkspace.mockReset();

    const { createDashboardWorkspaceMutationOptions } =
      await import("./dashboard-workspace-summary");

    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [],
      forms: [
        {
          id: "form-1",
          title: "Form A",
          updatedAt: "2024-01-03T00:00:00.000Z",
          workspaceId: "workspace-1",
        },
      ],
    });

    const options = createDashboardWorkspaceMutationOptions(queryClient, "org-1");
    const context = await options.onMutate?.({ name: "New Collection" });

    await options.onSuccess?.(
      {
        workspace: {
          id: "workspace-server",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "New Collection",
          createdAt: "2024-01-05T00:00:00.000Z",
          updatedAt: "2024-01-05T00:00:00.000Z",
        },
      },
      { name: "New Collection" },
      context,
    );

    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      workspaces: [
        {
          id: "workspace-server",
          organizationId: "org-1",
          name: "New Collection",
        },
      ],
      forms: [
        {
          id: "form-1",
          title: "Form A",
        },
      ],
    });
  });

  it("rolls back the optimistic workspace when create fails", async () => {
    getWorkspacesWithForms.mockReset();
    createWorkspace.mockReset();

    const { createDashboardWorkspaceMutationOptions } =
      await import("./dashboard-workspace-summary");

    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [
        {
          id: "workspace-1",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Existing",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      forms: [],
    });

    const options = createDashboardWorkspaceMutationOptions(queryClient, "org-1");
    const context = await options.onMutate?.({ name: "New Collection" });

    await options.onError?.(new Error("create failed"), { name: "New Collection" }, context);

    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      workspaces: [
        {
          id: "workspace-1",
          organizationId: "org-1",
          name: "Existing",
        },
      ],
      forms: [],
    });
  });
});
