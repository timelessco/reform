import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Value } from "platejs";
import { forms, formVersions, submissions } from "@/db/schema";
import { db } from "@/db";
import {
  getEditableFields,
  transformPlateStateToFormElements,
} from "@/lib/editor/transform-plate-to-form";
import { authMiddleware } from "@/lib/auth/middleware";
import { authForm, getActiveOrgId } from "./auth-helpers";

// Serialized submission type for client consumption
export type SerializedSubmission = {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

const serializeSubmission = (s: typeof submissions.$inferSelect) => ({
  ...s,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
  data: s.data as Record<string, object>,
});

// DELETE submission
export const deleteSubmission = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid(), formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);
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
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);
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
      search: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { formId, cursor, limit, search } = data;

    const orgId = getActiveOrgId(context.session);
    await authForm(formId, context.session.user.id, orgId);

    const cursorCondition = cursor
      ? or(
          lt(submissions.createdAt, new Date(cursor.createdAt)),
          and(eq(submissions.createdAt, new Date(cursor.createdAt)), lt(submissions.id, cursor.id)),
        )
      : undefined;

    const searchCondition = search?.trim()
      ? sql`${submissions.data}::text ILIKE ${"%" + search.trim() + "%"}`
      : undefined;

    const conditions = [eq(submissions.formId, formId), cursorCondition, searchCondition].filter(
      Boolean,
    );

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

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
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);

    const [result] = await db
      .select({ total: count() })
      .from(submissions)
      .where(eq(submissions.formId, data.formId));

    return { total: result?.total ?? 0 };
  });

/**
 * Bootstrap data for the submissions page: published form content, total count,
 * and a complete name → label map across ALL historical versions.
 *
 * Replaces three separate queries (published version, count, historical labels)
 * with one round-trip and removes the orphan-detection waterfall.
 */
export const getSubmissionsBootstrap = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);

    const [publishedRow, countRow, allVersions] = await Promise.all([
      db
        .select({
          id: forms.id,
          status: forms.status,
          icon: forms.icon,
          cover: forms.cover,
          lastPublishedVersionId: forms.lastPublishedVersionId,
          versionTitle: formVersions.title,
          versionContent: formVersions.content,
          versionSettings: formVersions.settings,
          versionCustomization: formVersions.customization,
        })
        .from(forms)
        .leftJoin(formVersions, eq(forms.lastPublishedVersionId, formVersions.id))
        .where(and(eq(forms.id, data.formId), eq(forms.status, "published")))
        .then((rows) => rows[0]),
      db
        .select({ total: count() })
        .from(submissions)
        .where(eq(submissions.formId, data.formId))
        .then((rows) => rows[0]),
      db
        .select({ content: formVersions.content })
        .from(formVersions)
        .where(eq(formVersions.formId, data.formId))
        .orderBy(desc(formVersions.version)),
    ]);

    // Resolve labels across every historical version. Newest version wins on conflict.
    const fieldLabels: Record<string, string> = {};
    for (const v of allVersions) {
      const elements = transformPlateStateToFormElements(v.content as Value);
      for (const field of getEditableFields(elements)) {
        if ("label" in field && field.label && !(field.name in fieldLabels)) {
          fieldLabels[field.name] = field.label;
        }
      }
    }

    const form =
      publishedRow && publishedRow.lastPublishedVersionId && publishedRow.versionContent
        ? {
            id: publishedRow.id,
            title: publishedRow.versionTitle ?? "",
            content: publishedRow.versionContent as object[],
            settings: publishedRow.versionSettings as Record<string, object>,
            customization: (publishedRow.versionCustomization ?? {}) as Record<string, string>,
            icon: publishedRow.icon,
            cover: publishedRow.cover,
            status: publishedRow.status,
          }
        : null;

    return {
      form,
      totalCount: countRow?.total ?? 0,
      fieldLabels,
    };
  });
