import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray } from "drizzle-orm";
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
const getSubmissionsByFormId = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await authForm(data.formId, context.session.user.id);
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
  .inputValidator(z.object({ id: z.string().uuid(), formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await authForm(data.formId, context.session.user.id);
    await db.delete(submissions).where(eq(submissions.id, data.id));
    return { success: true };
  });

// DELETE submissions bulk
export const deleteSubmissionsBulk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      submissionIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data, context }) => {
    await authForm(data.formId, context.session.user.id);
    if (data.submissionIds.length === 0) {
      return { success: true, deleted: 0 };
    }
    await db.delete(submissions).where(inArray(submissions.id, data.submissionIds));
    return { success: true, deleted: data.submissionIds.length };
  });

// Query options
export const getSubmissionsByFormIdQueryOption = (formId: string) =>
  queryOptions({
    queryKey: ["submissions", formId],
    queryFn: () => getSubmissionsByFormId({ data: { formId } }),
    refetchOnWindowFocus: true,
  });
