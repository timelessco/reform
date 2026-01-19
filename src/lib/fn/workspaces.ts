import { db } from "@/db";
import { workspaces, forms } from "@/db/schema";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";
import { authUser, authWorkspace, getTxId } from "./helpers";

const workspaceSchema = z.object({
	id: z.string().uuid(),
	name: z.string().max(100),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});
const authMiddleware = createMiddleware({type : 'function'}).server(async ({ next }) => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return await next({
		context: {
			user : session.user,
		},
	});
});
export const createWorkspace = createServerFn({ method: "POST" })
.middleware([authMiddleware])
	.inputValidator(
		workspaceSchema.pick({ name: true }).extend({
			name: workspaceSchema.shape.name.optional().default("My workspace"),
		}),
	)
	.handler(async ({ data }) => {
		const user = await authUser();
		const now = new Date();

		const [workspace] = await db
			.insert(workspaces)
			.values({
				id:  crypto.randomUUID(),
				userId: user.id,
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
	.inputValidator(
		workspaceSchema.pick({ id: true, name: true }).partial({ name: true }),
	)
	.handler(async ({ data }) => {
		const { id, ...updateData } = data;
		await authWorkspace(id);

		const [workspace] = await db
			.update(workspaces)
			.set({
				...updateData,
				updatedAt: new Date(),
			})
			.where(eq(workspaces.id, id))
			.returning();

		const txid = await getTxId();

		return {
			workspace: {
				...workspace,
				createdAt: workspace.createdAt.toISOString(),
				updatedAt: workspace.updatedAt.toISOString(),
			},
			txid,
		};
	});

export const deleteWorkspace = createServerFn({ method: "POST" })
.middleware([authMiddleware])
	.inputValidator(workspaceSchema.pick({ id: true }))
	.handler(async ({ data }) => {
		await authWorkspace(data.id);

		const [workspace] = await db
			.delete(workspaces)
			.where(eq(workspaces.id, data.id))
			.returning();

		const txid = await getTxId();

		return {
			workspace: {
				...workspace,
				createdAt: workspace.createdAt.toISOString(),
				updatedAt: workspace.updatedAt.toISOString(),
			},
			txid,
		};
	});

export const getWorkspaceById = createServerFn({ method: "GET" })
.middleware([authMiddleware])
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		await authWorkspace(data.id);

		const [workspace] = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, data.id));

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
	.handler(async () => {
		const user = await authUser();

		const workspaceList = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.userId, user.id))
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
	.handler(async () => {
		const user = await authUser();

		// Get workspaces for the user
		const workspaceList = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.userId, user.id))
			.orderBy(workspaces.createdAt);

		// Get all forms for the user's workspaces
		const formsList = await db
			.select({
				id: forms.id,
				title: forms.title,
				updatedAt: forms.updatedAt,
				workspaceId: forms.workspaceId,
			})
			.from(forms)
			.where(eq(forms.userId, user.id))
			.orderBy(forms.updatedAt);

		// Group forms by workspaceId
		const formsByWorkspace = formsList.reduce((acc, form) => {
			if (!acc[form.workspaceId]) {
				acc[form.workspaceId] = [];
			}
			acc[form.workspaceId].push({
				...form,
				updatedAt: form.updatedAt.toISOString(),
			});
			return acc;
		}, {} as Record<string, any[]>);

		return {
			workspaces: workspaceList.map((workspace) => ({
				...workspace,
				createdAt: workspace.createdAt.toISOString(),
				updatedAt: workspace.updatedAt.toISOString(),
				forms: formsByWorkspace[workspace.id] || [],
			})),
		};
	});
