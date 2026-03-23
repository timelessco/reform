import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createClientCommandLayer } from "@/lib/client-command-layer";

describe("createClientCommandLayer", () => {
  it("creates a workspace optimistically in dashboard and navigation caches, then reconciles it", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [],
      forms: [],
    });
    queryClient.setQueryData(["navigation-workspaces"], []);

    const layer = createClientCommandLayer({
      activeOrgId: "org-1",
      queryClient,
      deps: {
        archiveForm: vi.fn(),
        createForm: vi.fn(),
        createWorkspace: vi.fn(async () => ({
          id: "workspace-server",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Workspace",
          createdAt: "2024-01-02T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        })),
        deleteWorkspace: vi.fn(),
        duplicateForm: vi.fn(),
        renameWorkspace: vi.fn(),
      },
    });

    const workspace = await layer.createWorkspace({ name: "Workspace" });

    expect(workspace).toMatchObject({
      id: "workspace-server",
      organizationId: "org-1",
      name: "Workspace",
    });
    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      workspaces: [{ id: "workspace-server", name: "Workspace" }],
      forms: [],
    });
    expect(queryClient.getQueryData(["navigation-workspaces"])).toMatchObject([
      { id: "workspace-server", name: "Workspace" },
    ]);
  });

  it("creates a form and syncs dashboard, navigation, and form-detail caches", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [
        {
          id: "workspace-1",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Workspace",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      forms: [],
    });
    queryClient.setQueryData(["navigation-forms", "org-1"], []);

    const form = {
      id: "form-1",
      title: "Untitled",
      workspaceId: "workspace-1",
      status: "draft",
      updatedAt: "2024-01-02T00:00:00.000Z",
      createdAt: "2024-01-02T00:00:00.000Z",
      icon: null,
      customization: {},
      content: [],
      settings: {},
      formName: "draft",
    };

    const layer = createClientCommandLayer({
      activeOrgId: "org-1",
      queryClient,
      deps: {
        archiveForm: vi.fn(),
        createForm: vi.fn(async () => form),
        createWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        duplicateForm: vi.fn(),
        renameWorkspace: vi.fn(),
      },
    });

    const createdForm = await layer.createForm({ workspaceId: "workspace-1" });

    expect(createdForm).toMatchObject({ id: "form-1", workspaceId: "workspace-1" });
    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      forms: [{ id: "form-1", workspaceId: "workspace-1", title: "Untitled" }],
    });
    expect(queryClient.getQueryData(["navigation-forms", "org-1"])).toMatchObject([
      { id: "form-1", workspaceId: "workspace-1", title: "Untitled" },
    ]);
    expect(queryClient.getQueryData(["forms", "form-1"])).toMatchObject({
      form: { id: "form-1", status: "draft" },
    });
  });

  it("archives a form optimistically and rolls back on failure", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [],
      forms: [
        {
          id: "form-1",
          title: "Draft",
          workspaceId: "workspace-1",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    });
    queryClient.setQueryData(
      ["navigation-forms", "org-1"],
      [
        {
          id: "form-1",
          title: "Draft",
          workspaceId: "workspace-1",
          status: "draft",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    );
    queryClient.setQueryData(["forms", "form-1"], {
      form: {
        id: "form-1",
        status: "draft",
      },
    });

    const layer = createClientCommandLayer({
      activeOrgId: "org-1",
      queryClient,
      deps: {
        archiveForm: vi.fn(async () => {
          throw new Error("archive failed");
        }),
        createForm: vi.fn(),
        createWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        duplicateForm: vi.fn(),
        renameWorkspace: vi.fn(),
      },
    });

    await expect(layer.archiveForm({ formId: "form-1" })).rejects.toThrow("archive failed");

    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      forms: [{ id: "form-1", title: "Draft" }],
    });
    expect(queryClient.getQueryData(["navigation-forms", "org-1"])).toMatchObject([
      { id: "form-1", status: "draft" },
    ]);
    expect(queryClient.getQueryData(["forms", "form-1"])).toMatchObject({
      form: { id: "form-1", status: "draft" },
    });
  });

  it("renames and deletes a workspace through the shared command layer", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [
        {
          id: "workspace-1",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Old Name",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      forms: [
        {
          id: "form-1",
          title: "Draft",
          workspaceId: "workspace-1",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    });
    queryClient.setQueryData(
      ["navigation-workspaces"],
      [
        {
          id: "workspace-1",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Old Name",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    );
    queryClient.setQueryData(
      ["navigation-forms", "org-1"],
      [
        {
          id: "form-1",
          title: "Draft",
          workspaceId: "workspace-1",
          status: "draft",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
    );

    const layer = createClientCommandLayer({
      activeOrgId: "org-1",
      queryClient,
      deps: {
        archiveForm: vi.fn(),
        createForm: vi.fn(),
        createWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(async () => undefined),
        duplicateForm: vi.fn(),
        renameWorkspace: vi.fn(async () => undefined),
      },
    });

    await layer.renameWorkspace({ name: "Renamed Workspace", workspaceId: "workspace-1" });

    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      workspaces: [{ id: "workspace-1", name: "Renamed Workspace" }],
    });
    expect(queryClient.getQueryData(["navigation-workspaces"])).toMatchObject([
      { id: "workspace-1", name: "Renamed Workspace" },
    ]);

    await layer.deleteWorkspace({ workspaceId: "workspace-1" });

    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      workspaces: [],
      forms: [],
    });
    expect(queryClient.getQueryData(["navigation-workspaces"])).toMatchObject([]);
    expect(queryClient.getQueryData(["navigation-forms", "org-1"])).toMatchObject([]);
  });

  it("duplicates a form and adds the copy to listing and detail caches", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard-workspace-summary", "org-1"], {
      workspaces: [],
      forms: [],
    });
    queryClient.setQueryData(["navigation-forms", "org-1"], []);

    const duplicate = {
      id: "form-copy",
      title: "Draft copy",
      workspaceId: "workspace-1",
      status: "draft",
      updatedAt: "2024-01-03T00:00:00.000Z",
      createdAt: "2024-01-03T00:00:00.000Z",
      icon: null,
      customization: {},
      content: [],
      settings: {},
      formName: "draft",
    };

    const layer = createClientCommandLayer({
      activeOrgId: "org-1",
      queryClient,
      deps: {
        archiveForm: vi.fn(),
        createForm: vi.fn(),
        createWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        duplicateForm: vi.fn(() => duplicate),
        renameWorkspace: vi.fn(),
      },
    });

    const duplicated = await layer.duplicateForm({ formId: "form-1" });

    expect(duplicated).toMatchObject({ id: "form-copy", title: "Draft copy" });
    expect(queryClient.getQueryData(["dashboard-workspace-summary", "org-1"])).toMatchObject({
      forms: [{ id: "form-copy", title: "Draft copy" }],
    });
    expect(queryClient.getQueryData(["navigation-forms", "org-1"])).toMatchObject([
      { id: "form-copy", title: "Draft copy" },
    ]);
    expect(queryClient.getQueryData(["forms", "form-copy"])).toMatchObject({
      form: { id: "form-copy", status: "draft" },
    });
  });
});
