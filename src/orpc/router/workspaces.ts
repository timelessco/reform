import { os } from "@orpc/server";
import { eq, and, sql } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/db";
import { workspaces, forms } from "@/db/schema";

// Create workspace
export const createWorkspace = os
	.input(
		z.object({
			id: z.string().uuid(),
			name: z.string().default("My workspace"),
		}),
	)
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		const [workspace] = await db
			.insert(workspaces)
			.values({
				id: input.id,
				userId,
				name: input.name,
			})
			.returning();

		// Get transaction ID for Electric sync
		const result = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result.rows[0]?.txid ?? 0);

		return { workspace, txid };
	});

// Update workspace
export const updateWorkspace = os
	.input(
		z.object({
			id: z.string().uuid(),
			name: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		const [workspace] = await db
			.update(workspaces)
			.set({
				name: input.name,
				updatedAt: new Date(),
			})
			.where(and(eq(workspaces.id, input.id), eq(workspaces.userId, userId)))
			.returning();

		const result2 = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result2.rows[0]?.txid ?? 0);

		return { workspace, txid };
	});

// Delete workspace (cascade deletes forms)
export const deleteWorkspace = os
	.input(z.object({ id: z.string().uuid() }))
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		// Delete all forms in workspace first
		await db
			.delete(forms)
			.where(and(eq(forms.workspaceId, input.id), eq(forms.userId, userId)));

		// Delete workspace
		await db
			.delete(workspaces)
			.where(and(eq(workspaces.id, input.id), eq(workspaces.userId, userId)));

		const result3 = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result3.rows[0]?.txid ?? 0);

		return { success: true, txid };
	});

// Get or create default workspace (for login migration)
export const getOrCreateDefaultWorkspace = os
	.input(z.object({}))
	.handler(async ({ context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		// Check for existing workspaces
		const existing = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.userId, userId))
			.orderBy(workspaces.createdAt)
			.limit(1);

		if (existing.length > 0) {
			return { workspace: existing[0], created: false };
		}

		// Create default workspace
		const [workspace] = await db
			.insert(workspaces)
			.values({
				id: crypto.randomUUID(),
				userId,
				name: "My workspace",
			})
			.returning();

		const result4 = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result4.rows[0]?.txid ?? 0);

		return { workspace, created: true, txid };
	});

// List workspaces for current user
export const listWorkspaces = os.input(z.object({})).handler(async ({ context }) => {
	const userId = (context as { userId?: string }).userId;
	if (!userId) throw new Error("Unauthorized");

	return db
		.select()
		.from(workspaces)
		.where(eq(workspaces.userId, userId))
		.orderBy(workspaces.createdAt);
});
