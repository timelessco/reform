import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { submissions } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { authForm } from "./helpers";

// Serialized submission type for client consumption
export type SerializedSubmission = {
	id: string;
	formId: string;
	data: Record<string, any>;
	isCompleted: boolean;
	createdAt: string;
	updatedAt: string;
};

const serializeSubmission = (s: typeof submissions.$inferSelect) => ({
	...s,
	createdAt: s.createdAt.toISOString(),
	updatedAt: s.updatedAt.toISOString(),
	data: s.data as any,
});

// GET submissions by form
export const getSubmissionsByFormId = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ formId: z.string().uuid() }))
	.handler(async ({ data }) => {
		await authForm(data.formId);
		const list = await db
			.select()
			.from(submissions)
			.where(eq(submissions.formId, data.formId))
			.orderBy(desc(submissions.createdAt));
		return { submissions: list.map(serializeSubmission) };
	});

// DELETE submission
export const deleteSubmission = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({ id: z.string().uuid(), formId: z.string().uuid() }),
	)
	.handler(async ({ data }) => {
		await authForm(data.formId);
		await db.delete(submissions).where(eq(submissions.id, data.id));
		return { success: true };
	});

// Query options
export const getSubmissionsByFormIdQueryOption = (formId: string) =>
	queryOptions({
		queryKey: ["submissions", formId],
		queryFn: () => getSubmissionsByFormId({ data: { formId } }),
		refetchOnWindowFocus: true,
	});
