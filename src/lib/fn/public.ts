import { db } from "@/db";
import { forms, submissions } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

/**
 * Public server functions - NO authentication required
 * Used for public form viewing and submission
 */

const serializePublicForm = (form: typeof forms.$inferSelect) => ({
	id: form.id,
	title: form.title,
	content: form.content as any,
	icon: form.icon,
	cover: form.cover,
	status: form.status,
});

/**
 * Get a published form by ID (public access)
 * Only returns forms with status === "published"
 */
export const getPublishedFormById = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const [form] = await db
			.select()
			.from(forms)
			.where(and(eq(forms.id, data.id), eq(forms.status, "published")));

		if (!form) {
			return { form: null, error: "not_found" as const };
		}

		return {
			form: serializePublicForm(form),
			error: null,
		};
	});

/**
 * Create a submission for a published form (public access)
 * Validates that the form is published before accepting submission
 */
export const createPublicSubmission = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			formId: z.string().uuid(),
			data: z.record(z.string(), z.any()),
			isCompleted: z.boolean().default(true),
		}),
	)
	.handler(async ({ data }) => {
		// Verify form exists and is published
		const [form] = await db
			.select({ status: forms.status })
			.from(forms)
			.where(eq(forms.id, data.formId));

		if (!form) {
			throw new Error("Form not found");
		}

		if (form.status !== "published") {
			throw new Error("Form is not accepting submissions");
		}

		const id = crypto.randomUUID();
		const now = new Date();

		await db.insert(submissions).values({
			id,
			formId: data.formId,
			data: data.data,
			isCompleted: data.isCompleted,
			createdAt: now,
			updatedAt: now,
		});

		return { submissionId: id, success: true };
	});
