import {
  formAnalyticsDaily,
  formDropoffDaily,
  formFavorites,
  formQuestionProgress,
  forms,
  formVersions,
  formVisits,
  member,
  submissions,
  workspaces,
} from "@/db/schema";
import { db } from "@/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { createServerFn } from "@tanstack/react-start";
import { count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { authWorkspace, getActiveOrgId } from "./auth-helpers";

const workspaceSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().max(100),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    workspaceSchema.pick({ organizationId: true, name: true }).extend({
      id: z.string().uuid().optional(),
      name: workspaceSchema.shape.name.optional().default("Collection"),
    }),
  )
  .handler(async ({ data, context }) => {
    const now = new Date();

    const [workspace] = await db
      .insert(workspaces)
      .values({
        id: data.id ?? crypto.randomUUID(),
        organizationId: data.organizationId,
        createdByUserId: context.session.user.id,
        name: data.name,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    };
  });

export const updateWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(workspaceSchema.pick({ id: true, name: true }).partial({ name: true }))
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;
    const orgId = getActiveOrgId(context.session);
    await authWorkspace(id, context.session.user.id, orgId);

    const [workspace] = await db
      .update(workspaces)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();

    return {
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    };
  });

export const deleteWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(workspaceSchema.pick({ id: true }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    await authWorkspace(data.id, context.session.user.id, orgId);

    // Ensure at least one workspace remains in the organization
    const [{ total }] = await db
      .select({ total: count() })
      .from(workspaces)
      .where(eq(workspaces.organizationId, orgId));
    if (total <= 1) {
      throw new Error("Cannot delete the last workspace. You must have at least one workspace.");
    }

    return await db.transaction(async (tx) => {
      // Cascade-delete all forms and their dependent records
      const workspaceForms = await tx
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.workspaceId, data.id));
      const formIds = workspaceForms.map((f) => f.id);

      if (formIds.length > 0) {
        await Promise.all([
          tx.delete(formAnalyticsDaily).where(inArray(formAnalyticsDaily.formId, formIds)),
          tx.delete(formDropoffDaily).where(inArray(formDropoffDaily.formId, formIds)),
          tx.delete(formQuestionProgress).where(inArray(formQuestionProgress.formId, formIds)),
          tx.delete(formVisits).where(inArray(formVisits.formId, formIds)),
          tx.delete(formFavorites).where(inArray(formFavorites.formId, formIds)),
          tx.delete(submissions).where(inArray(submissions.formId, formIds)),
          tx.delete(formVersions).where(inArray(formVersions.formId, formIds)),
        ]);
        await tx.delete(forms).where(inArray(forms.id, formIds));
      }

      const [workspace] = await tx.delete(workspaces).where(eq(workspaces.id, data.id)).returning();

      return {
        workspace: {
          ...workspace,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
        },
      };
    });
  });

export const getWorkspaces = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // Use a single JOIN query instead of membership -> workspaces waterfall
    const workspaceList = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        organizationId: workspaces.organizationId,
        createdByUserId: workspaces.createdByUserId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .innerJoin(member, eq(workspaces.organizationId, member.organizationId))
      .where(eq(member.userId, context.session.user.id))
      .orderBy(workspaces.createdAt);

    return {
      workspaces: workspaceList.map((workspace) => ({
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      })),
    };
  });
