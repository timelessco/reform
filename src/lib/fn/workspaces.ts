import { forms, member, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray, not } from "drizzle-orm";
import { z } from "zod";
import { authWorkspace, getTxId } from "./helpers";

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

    return await db.transaction(async (tx) => {
      const [workspace] = await tx
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

      const txid = await getTxId(tx);

      return {
        workspace: {
          ...workspace,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
        },
        txid,
      };
    });
  });

export const updateWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(workspaceSchema.pick({ id: true, name: true }).partial({ name: true }))
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;
    const authPromise = authWorkspace(id, context.session.user.id);
    await authPromise;

    return await db.transaction(async (tx) => {
      const [workspace] = await tx
        .update(workspaces)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, id))
        .returning();

      const txid = await getTxId(tx);

      return {
        workspace: {
          ...workspace,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
        },
        txid,
      };
    });
  });

export const deleteWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(workspaceSchema.pick({ id: true }))
  .handler(async ({ data, context }) => {
    const authPromise = authWorkspace(data.id, context.session.user.id);
    await authPromise;

    return await db.transaction(async (tx) => {
      const [workspace] = await tx.delete(workspaces).where(eq(workspaces.id, data.id)).returning();

      const txid = await getTxId(tx);

      return {
        workspace: {
          ...workspace,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
        },
        txid,
      };
    });
  });

export const getWorkspaceById = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const [_, [workspace]] = await Promise.all([
      authWorkspace(data.id, context.session.user.id),
      db.select().from(workspaces).where(eq(workspaces.id, data.id)),
    ]);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    return {
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    };
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

export const getWorkspacesWithForms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // Get organizations the user is a member of
    const userMemberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, context.session.user.id));

    if (userMemberships.length === 0) {
      return { workspaces: [] };
    }

    const orgIds = userMemberships.map((m) => m.organizationId);

    // Run workspace + forms queries in parallel
    const [workspaceList, formsList] = await Promise.all([
      db
        .select()
        .from(workspaces)
        .where(inArray(workspaces.organizationId, orgIds))
        .orderBy(workspaces.createdAt),
      db
        .select({
          id: forms.id,
          title: forms.title,
          status: forms.status,
          updatedAt: forms.updatedAt,
          workspaceId: forms.workspaceId,
          icon: forms.icon,
          customization: forms.customization,
        })
        .from(forms)
        .where(not(eq(forms.status, "archived")))
        .orderBy(desc(forms.updatedAt)),
    ]);

    // Group forms by workspaceId
    const formsByWorkspace = formsList.reduce(
      (acc, form) => {
        if (!acc[form.workspaceId]) {
          acc[form.workspaceId] = [];
        }
        acc[form.workspaceId].push({
          ...form,
          updatedAt: form.updatedAt.toISOString(),
          customization: (form.customization ?? {}) as Record<string, string>,
        });
        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          title: string | null;
          status: string;
          updatedAt: string;
          workspaceId: string;
          icon: string | null;
          customization: Record<string, string>;
        }[]
      >,
    );

    return {
      workspaces: workspaceList.map((workspace) => ({
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
        forms: formsByWorkspace[workspace.id] || [],
      })),
    };
  });

export const getWorkspacesWithFormsQueryOptions = () =>
  queryOptions({
    queryKey: ["workspaces-with-forms"],
    queryFn: () => getWorkspacesWithForms(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

const getUserMemberships = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const memberships = await db
      .select({
        organizationId: member.organizationId,
        role: member.role,
      })
      .from(member)
      .where(eq(member.userId, context.session.user.id));

    return { memberships };
  });

export const getUserMembershipsQueryOptions = () =>
  queryOptions({
    queryKey: ["user-memberships"],
    queryFn: () => getUserMemberships(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
