import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, inArray, lt, or } from "drizzle-orm";
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
    const [_, list] = await Promise.all([
      authForm(data.formId, context.session.user.id),
      db
        .select()
        .from(submissions)
        .where(eq(submissions.formId, data.formId))
        .orderBy(desc(submissions.createdAt)),
    ]);
    return { submissions: list.map(serializeSubmission) };
  });

// DELETE submission
export const deleteSubmission = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid(), formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const authPromise = authForm(data.formId, context.session.user.id);
    await authPromise;
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
    const authPromise = authForm(data.formId, context.session.user.id);
    await authPromise;
    if (data.submissionIds.length === 0) {
      return { success: true, deleted: 0 };
    }
    await db.delete(submissions).where(inArray(submissions.id, data.submissionIds));
    return { success: true, deleted: data.submissionIds.length };
  });

// Cursor pagination types and constants
export type SubmissionCursor = { createdAt: string; id: string };
export const SUBMISSIONS_PAGE_SIZE = 50;

// GET submissions by form (cursor-paginated)
export const getSubmissionsByFormIdPaginated = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      cursor: z.object({ createdAt: z.string(), id: z.string() }).optional(),
      limit: z.number().int().min(1).max(100).default(SUBMISSIONS_PAGE_SIZE),
    }),
  )
  .handler(async ({ data, context }) => {
    const { formId, cursor, limit } = data;

    await authForm(formId, context.session.user.id);

    const cursorCondition = cursor
      ? or(
          lt(submissions.createdAt, new Date(cursor.createdAt)),
          and(eq(submissions.createdAt, new Date(cursor.createdAt)), lt(submissions.id, cursor.id)),
        )
      : undefined;

    const whereCondition = cursorCondition
      ? and(eq(submissions.formId, formId), cursorCondition)
      : eq(submissions.formId, formId);

    const rows = await db
      .select()
      .from(submissions)
      .where(whereCondition)
      .orderBy(desc(submissions.createdAt), desc(submissions.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
    const lastRow = pageRows.at(-1);

    const nextCursor: SubmissionCursor | undefined =
      hasNextPage && lastRow
        ? {
            createdAt: lastRow.createdAt.toISOString(),
            id: lastRow.id,
          }
        : undefined;

    return {
      submissions: pageRows.map(serializeSubmission),
      nextCursor,
    };
  });

// GET submissions count by form
export const getSubmissionsCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await authForm(data.formId, context.session.user.id);

    const [result] = await db
      .select({ total: count() })
      .from(submissions)
      .where(eq(submissions.formId, data.formId));

    return { total: result?.total ?? 0 };
  });

// Query options
export const getSubmissionsByFormIdQueryOption = (formId: string) =>
  queryOptions({
    queryKey: ["submissions", formId],
    queryFn: () => getSubmissionsByFormId({ data: { formId } }),
    refetchOnWindowFocus: true,
  });

export const getSubmissionsCountQueryOption = (formId: string) =>
  queryOptions({
    queryKey: ["submissions", formId, "count"],
    queryFn: () => getSubmissionsCount({ data: { formId } }),
  });
