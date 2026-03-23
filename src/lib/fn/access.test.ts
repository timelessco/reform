import { describe, expect, it } from "vitest";
import { createAccessAuthorizer } from "./access";

const workspaceRecord = {
  id: "workspace-1",
  organizationId: "org-1",
};

const formRecord = {
  id: "form-1",
  workspaceId: "workspace-1",
  organizationId: "org-1",
};

describe("createAccessAuthorizer", () => {
  it("allows a user to access a workspace when they belong to its organization", async () => {
    const authorizer = createAccessAuthorizer({
      getWorkspaceById: async () => workspaceRecord,
      getFormById: async () => null,
      getOrganizationMembershipIdsByUserId: async () => ["org-1"],
    });

    await expect(authorizer.authWorkspace("workspace-1", "member-2")).resolves.toStrictEqual({
      workspace: {
        id: "workspace-1",
        organizationId: "org-1",
      },
    });
  });

  it("denies workspace access when the user is not a member of the owning organization", async () => {
    const authorizer = createAccessAuthorizer({
      getWorkspaceById: async () => workspaceRecord,
      getFormById: async () => null,
      getOrganizationMembershipIdsByUserId: async () => ["org-2"],
    });

    await expect(authorizer.authWorkspace("workspace-1", "member-2")).rejects.toThrow(
      "Not found or access denied",
    );
  });

  it("allows a user to access a form when they belong to the owning workspace organization", async () => {
    const authorizer = createAccessAuthorizer({
      getWorkspaceById: async () => null,
      getFormById: async () => formRecord,
      getOrganizationMembershipIdsByUserId: async () => ["org-1"],
    });

    await expect(authorizer.authForm("form-1", "member-2")).resolves.toStrictEqual({
      form: {
        id: "form-1",
        workspaceId: "workspace-1",
        organizationId: "org-1",
      },
    });
  });

  it("denies form access when the user is not a member of the owning workspace organization", async () => {
    const authorizer = createAccessAuthorizer({
      getWorkspaceById: async () => null,
      getFormById: async () => formRecord,
      getOrganizationMembershipIdsByUserId: async () => ["org-2"],
    });

    await expect(authorizer.authForm("form-1", "member-2")).rejects.toThrow(
      "Not found or access denied",
    );
  });
});
