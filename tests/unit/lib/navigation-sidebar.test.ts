import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  buildNavigationSidebarData,
  createToggleFavoriteMutationOptions,
} from "@/lib/navigation-sidebar";

describe("buildNavigationSidebarData", () => {
  it("groups active-org form listings under workspaces and derives favorites from favorite rows", () => {
    const result = buildNavigationSidebarData({
      activeOrgId: "org-1",
      favorites: [
        {
          id: "user-1:form-2",
          userId: "user-1",
          formId: "form-2",
          createdAt: "2024-01-05T00:00:00.000Z",
        },
      ],
      forms: [
        {
          id: "form-1",
          title: "Draft Form",
          workspaceId: "workspace-1",
          status: "draft",
          updatedAt: "2024-01-03T00:00:00.000Z",
          icon: null,
          customization: {},
        },
        {
          id: "form-2",
          title: "Favorite Form",
          workspaceId: "workspace-2",
          status: "published",
          updatedAt: "2024-01-04T00:00:00.000Z",
          icon: "star",
          customization: { accentColor: "#000" },
        },
      ],
      workspaces: [
        {
          id: "workspace-1",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Workspace One",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "workspace-2",
          organizationId: "org-1",
          createdByUserId: "user-1",
          name: "Workspace Two",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "workspace-3",
          organizationId: "org-2",
          createdByUserId: "user-2",
          name: "Other Org",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result).toMatchObject({
      favoriteForms: [
        {
          id: "form-2",
          title: "Favorite Form",
          workspaceId: "workspace-2",
        },
      ],
      workspaces: [
        {
          id: "workspace-1",
          forms: [{ id: "form-1", title: "Draft Form" }],
        },
        {
          id: "workspace-2",
          forms: [{ id: "form-2", title: "Favorite Form" }],
        },
      ],
    });
  });

  it("adds an optimistic favorite row immediately when toggling on", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["navigation-favorites"], []);

    const options = createToggleFavoriteMutationOptions(queryClient, "user-1");
    await options.onMutate?.({ formId: "form-1" });

    expect(queryClient.getQueryData(["navigation-favorites"])).toMatchObject([
      {
        userId: "user-1",
        formId: "form-1",
      },
    ]);
  });

  it("rolls back favorite rows when the toggle fails", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["navigation-favorites"],
      [
        {
          id: "user-1:form-2",
          userId: "user-1",
          formId: "form-2",
          createdAt: "2024-01-05T00:00:00.000Z",
        },
      ],
    );

    const options = createToggleFavoriteMutationOptions(queryClient, "user-1");
    const context = await options.onMutate?.({ formId: "form-1" });
    await options.onError?.(new Error("toggle failed"), { formId: "form-1" }, context);

    expect(queryClient.getQueryData(["navigation-favorites"])).toMatchObject([
      {
        userId: "user-1",
        formId: "form-2",
      },
    ]);
  });

  it("removes an existing favorite optimistically when toggling off", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["navigation-favorites"],
      [
        {
          id: "user-1:form-1",
          userId: "user-1",
          formId: "form-1",
          createdAt: "2024-01-05T00:00:00.000Z",
        },
        {
          id: "user-1:form-2",
          userId: "user-1",
          formId: "form-2",
          createdAt: "2024-01-06T00:00:00.000Z",
        },
      ],
    );

    const options = createToggleFavoriteMutationOptions(queryClient, "user-1");
    await options.onMutate?.({ formId: "form-1" });

    expect(queryClient.getQueryData(["navigation-favorites"])).toMatchObject([
      {
        userId: "user-1",
        formId: "form-2",
      },
    ]);
  });
});
