import "dotenv/config";
import { inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { forms, member, organization, user, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { authForm, authWorkspace } from "./helpers";

describe("auth helpers integration", () => {
  it.skipIf(!process.env.DATABASE_URL)(
    "allows one org member to access another member's workspace and form",
    async () => {
      const now = new Date();
      const orgId = crypto.randomUUID();
      const creatorId = crypto.randomUUID();
      const memberUserId = crypto.randomUUID();
      const workspaceId = crypto.randomUUID();
      const formId = crypto.randomUUID();
      const createdIds = {
        formIds: new Set<string>([formId]),
        memberIds: new Set<string>([`${creatorId}:${orgId}`, `${memberUserId}:${orgId}`]),
        organizationIds: new Set<string>([orgId]),
        userIds: new Set<string>([creatorId, memberUserId]),
        workspaceIds: new Set<string>([workspaceId]),
      };

      try {
        await db.insert(organization).values({
          id: orgId,
          name: "Auth Test Org",
          slug: `auth-test-${orgId}`,
          createdAt: now,
        });

        await db.insert(user).values([
          {
            id: creatorId,
            email: `${creatorId}@example.com`,
            emailVerified: true,
            name: "Creator",
            createdAt: now,
            updatedAt: now,
          },
          {
            id: memberUserId,
            email: `${memberUserId}@example.com`,
            emailVerified: true,
            name: "Member",
            createdAt: now,
            updatedAt: now,
          },
        ]);

        await db.insert(member).values([
          {
            id: `${creatorId}:${orgId}`,
            userId: creatorId,
            organizationId: orgId,
            role: "owner",
            createdAt: now,
          },
          {
            id: `${memberUserId}:${orgId}`,
            userId: memberUserId,
            organizationId: orgId,
            role: "member",
            createdAt: now,
          },
        ]);

        await db.insert(workspaces).values({
          id: workspaceId,
          organizationId: orgId,
          createdByUserId: creatorId,
          name: "Shared Workspace",
          createdAt: now,
          updatedAt: now,
        });

        await db.insert(forms).values({
          id: formId,
          createdByUserId: creatorId,
          workspaceId,
          title: "Shared Form",
          formName: "shared-form",
          schemaName: "sharedFormSchema",
          content: [],
          settings: {},
          createdAt: now,
          updatedAt: now,
        });

        await expect(authWorkspace(workspaceId, memberUserId)).resolves.toMatchObject({
          workspace: {
            id: workspaceId,
            organizationId: orgId,
          },
        });

        await expect(authForm(formId, memberUserId)).resolves.toMatchObject({
          form: {
            id: formId,
            workspaceId,
            organizationId: orgId,
          },
        });
      } finally {
        await db.delete(forms).where(inArray(forms.id, [...createdIds.formIds]));
        await db.delete(workspaces).where(inArray(workspaces.id, [...createdIds.workspaceIds]));
        await db.delete(member).where(inArray(member.id, [...createdIds.memberIds]));
        await db
          .delete(organization)
          .where(inArray(organization.id, [...createdIds.organizationIds]));
        await db.delete(user).where(inArray(user.id, [...createdIds.userIds]));
      }
    },
  );
});
