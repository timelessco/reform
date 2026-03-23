import { inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { forms, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { authForm, authWorkspace } from "@/lib/fn/helpers";
import { getBetterAuthOrganizationTestHelpers } from "../../helpers/better-auth";

describe("auth helpers integration", () => {
  it.skipIf(!process.env.DATABASE_URL)(
    "allows one org member to access another member's workspace and form",
    async () => {
      const testHelpers = await getBetterAuthOrganizationTestHelpers();
      const now = new Date();
      const creator = await testHelpers.saveUser(
        testHelpers.createUser({
          email: `creator-${crypto.randomUUID()}@example.com`,
          name: "Creator",
        }),
      );
      const collaborator = await testHelpers.saveUser(
        testHelpers.createUser({
          email: `member-${crypto.randomUUID()}@example.com`,
          name: "Member",
        }),
      );
      const org = await testHelpers.saveOrganization(
        testHelpers.createOrganization({
          name: "Auth Test Org",
          slug: `auth-test-${crypto.randomUUID()}`,
        }),
      );

      const workspaceId = crypto.randomUUID();
      const formId = crypto.randomUUID();

      try {
        await testHelpers.addMember({
          userId: creator.id,
          organizationId: String(org.id),
          role: "owner",
        });
        await testHelpers.addMember({
          userId: collaborator.id,
          organizationId: String(org.id),
          role: "member",
        });

        await db.insert(workspaces).values({
          id: workspaceId,
          organizationId: String(org.id),
          createdByUserId: creator.id,
          name: "Shared Workspace",
          createdAt: now,
          updatedAt: now,
        });

        await db.insert(forms).values({
          id: formId,
          createdByUserId: creator.id,
          workspaceId,
          title: "Shared Form",
          formName: "shared-form",
          schemaName: "sharedFormSchema",
          content: [],
          settings: {},
          createdAt: now,
          updatedAt: now,
        });

        await expect(authWorkspace(workspaceId, collaborator.id)).resolves.toMatchObject({
          workspace: {
            id: workspaceId,
            organizationId: String(org.id),
          },
        });

        await expect(authForm(formId, collaborator.id)).resolves.toMatchObject({
          form: {
            id: formId,
            workspaceId,
            organizationId: String(org.id),
          },
        });
      } finally {
        await db.delete(forms).where(inArray(forms.id, [formId]));
        await db.delete(workspaces).where(inArray(workspaces.id, [workspaceId]));
        await testHelpers.deleteOrganization(String(org.id));
        await testHelpers.deleteUser(collaborator.id);
        await testHelpers.deleteUser(creator.id);
      }
    },
  );
});
