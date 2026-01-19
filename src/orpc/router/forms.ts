import { os } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/db";
import { forms, workspaces } from "@/db/schema";
import { SettingsSchema } from "@/db-collections";

const FormInputSchema = z.object({
	id: z.string().uuid(),
	workspaceId: z.string().uuid(),
	title: z.string().optional(),
	formName: z.string().optional(),
	schemaName: z.string().optional(),
	content: z.array(z.any()).optional(),
	settings: SettingsSchema.partial().optional(),
	icon: z.string().nullable().optional(),
	cover: z.string().nullable().optional(),
	isMultiStep: z.boolean().optional(),
});

// Create form
export const createForm = os
	.input(FormInputSchema)
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		// Verify workspace belongs to user
		const workspace = await db
			.select()
			.from(workspaces)
			.where(
				and(
					eq(workspaces.id, input.workspaceId),
					eq(workspaces.userId, userId),
				),
			)
			.limit(1);

		if (workspace.length === 0) {
			throw new Error("Workspace not found");
		}

		const [form] = await db
			.insert(forms)
			.values({
				id: input.id,
				userId,
				workspaceId: input.workspaceId,
				title: input.title || "Untitled",
				formName: input.formName || "draft",
				schemaName: input.schemaName || "draftFormSchema",
				content: input.content || [],
				settings: input.settings || {},
				icon: input.icon,
				cover: input.cover,
				isMultiStep: input.isMultiStep || false,
			})
			.returning();

		const result = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result.rows[0]?.txid ?? 0);

		return { form, txid };
	});

// Update form
export const updateForm = os
	.input(FormInputSchema.partial().required({ id: true }))
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		const updateData: Record<string, any> = { updatedAt: new Date() };
		if (input.title !== undefined) updateData.title = input.title;
		if (input.formName !== undefined) updateData.formName = input.formName;
		if (input.schemaName !== undefined)
			updateData.schemaName = input.schemaName;
		if (input.content !== undefined) updateData.content = input.content;
		if (input.settings !== undefined) updateData.settings = input.settings;
		if (input.icon !== undefined) updateData.icon = input.icon;
		if (input.cover !== undefined) updateData.cover = input.cover;
		if (input.isMultiStep !== undefined)
			updateData.isMultiStep = input.isMultiStep;
		if (input.workspaceId !== undefined)
			updateData.workspaceId = input.workspaceId;

		const [form] = await db
			.update(forms)
			.set(updateData)
			.where(and(eq(forms.id, input.id), eq(forms.userId, userId)))
			.returning();

		const result2 = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result2.rows[0]?.txid ?? 0);

		return { form, txid };
	});

// Delete form
export const deleteForm = os
	.input(z.object({ id: z.string().uuid() }))
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		await db
			.delete(forms)
			.where(and(eq(forms.id, input.id), eq(forms.userId, userId)));

		const result3 = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result3.rows[0]?.txid ?? 0);

		return { success: true, txid };
	});

// Bulk insert forms (for migration from local to server)
export const bulkInsertForms = os
	.input(
		z.object({
			workspaceId: z.string().uuid(),
			forms: z.array(FormInputSchema),
		}),
	)
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		// Verify workspace belongs to user
		const workspace = await db
			.select()
			.from(workspaces)
			.where(
				and(
					eq(workspaces.id, input.workspaceId),
					eq(workspaces.userId, userId),
				),
			)
			.limit(1);

		if (workspace.length === 0) {
			throw new Error("Workspace not found");
		}

		if (input.forms.length === 0) {
			return { forms: [], txid: 0 };
		}

		const insertedForms = await db
			.insert(forms)
			.values(
				input.forms.map((f) => ({
					id: f.id,
					userId,
					workspaceId: input.workspaceId,
					title: f.title || "Untitled",
					formName: f.formName || "draft",
					schemaName: f.schemaName || "draftFormSchema",
					content: f.content || [],
					settings: f.settings || {},
					icon: f.icon,
					cover: f.cover,
					isMultiStep: f.isMultiStep || false,
				})),
			)
			.returning();

		const result4 = await db.execute(
			sql`SELECT pg_current_xact_id()::text::bigint as txid`,
		);
		const txid = Number(result4.rows[0]?.txid ?? 0);

		return { forms: insertedForms, txid };
	});

// List forms for current user (optionally filtered by workspace)
export const listForms = os
	.input(z.object({ workspaceId: z.string().uuid().optional() }))
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		let query = db.select().from(forms).where(eq(forms.userId, userId));

		if (input.workspaceId) {
			query = db
				.select()
				.from(forms)
				.where(
					and(
						eq(forms.userId, userId),
						eq(forms.workspaceId, input.workspaceId),
					),
				);
		}

		return query.orderBy(forms.updatedAt);
	});

// Get a single form by ID
export const getForm = os
	.input(z.object({ id: z.string().uuid() }))
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		const [form] = await db
			.select()
			.from(forms)
			.where(and(eq(forms.id, input.id), eq(forms.userId, userId)))
			.limit(1);

		if (!form) {
			throw new Error("Form not found");
		}

		return form;
	});

export const syncForms = os
	.input(
		z.array(
			z.object({
				id: z.string(),
				updatedAt: z.coerce.date(),
			}),
		),
	)
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		const localState = input;

		const serverForms = await db
			.select()
			.from(forms)
			.where(eq(forms.userId, userId));

		const changes: Array<
			| { type: "insert"; value: (typeof serverForms)[0] }
			| { type: "update"; value: (typeof serverForms)[0] }
			| { type: "delete"; value: string }
		> = [];

		const localMap = new Map(localState.map((l) => [l.id, l.updatedAt]));

		for (const serverForm of serverForms) {
			const localUpdatedAt = localMap.get(serverForm.id);

			if (!localUpdatedAt) {
				changes.push({ type: "insert", value: serverForm });
			} else if (
				serverForm.updatedAt &&
				serverForm.updatedAt > localUpdatedAt
			) {
				changes.push({ type: "update", value: serverForm });
			}
		}

		const serverIds = new Set(serverForms.map((f) => f.id));
		for (const local of localState) {
			if (!serverIds.has(local.id)) {
				changes.push({ type: "delete", value: local.id });
			}
		}

		return changes;
	});

export const removeForms = os
	.input(z.array(z.object({ id: z.string() })))
	.handler(async ({ input, context }) => {
		const userId = (context as { userId?: string }).userId;
		if (!userId) throw new Error("Unauthorized");

		for (const { id } of input) {
			await db
				.delete(forms)
				.where(and(eq(forms.id, id), eq(forms.userId, userId)));
		}

		return { success: true };
	});
