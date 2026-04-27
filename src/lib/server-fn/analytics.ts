import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  formAnalyticsDaily,
  formDropoffDaily,
  formQuestionProgress,
  formVisits,
} from "@/db/schema";
import { buildDailyAnalyticsRows, buildDailyDropoffRows } from "@/lib/analytics/aggregate-utils";
import { isBotUserAgent } from "@/lib/analytics/bot-filter";
import { mergeDropoffMetrics } from "@/lib/analytics/merge-dropoff";
import { mergeInsightsMetrics } from "@/lib/analytics/merge-metrics";
import { parseUserAgent } from "@/lib/analytics/parse-user-agent";
import { resolveTimeRange, splitTodayVsPast, toDateKey } from "@/lib/analytics/time-range";
import { authMiddleware } from "@/lib/auth/middleware";
import { authForm, getActiveOrgId } from "@/lib/server-fn/auth-helpers";
import type { FormInsightsMetrics, QuestionDropoffMetrics } from "@/types/analytics";

export const recordFormVisit = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      visitorHash: z.string().min(1).max(128),
      sessionId: z.string().min(1).max(128),
      referrer: z.string().nullish(),
      utmSource: z.string().nullish(),
      utmMedium: z.string().nullish(),
      utmCampaign: z.string().nullish(),
    }),
  )
  .handler(async ({ data }): Promise<{ visitId: string | null }> => {
    const headers = getRequestHeaders();
    const ua = headers.get("user-agent");

    if (isBotUserAgent(ua)) {
      return { visitId: null };
    }

    const parsed = parseUserAgent(ua);
    const country = headers.get("x-vercel-ip-country");

    const id = crypto.randomUUID();
    await db.insert(formVisits).values({
      id,
      formId: data.formId,
      visitorHash: data.visitorHash,
      sessionId: data.sessionId,
      referrer: data.referrer ?? null,
      utmSource: data.utmSource ?? null,
      utmMedium: data.utmMedium ?? null,
      utmCampaign: data.utmCampaign ?? null,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      browserVersion: parsed.browserVersion,
      os: parsed.os,
      osVersion: parsed.osVersion,
      country,
      // v1: store ISO code only; localized country names can be added later via a lookup table.
      countryName: null,
      city: null,
      region: null,
    });

    return { visitId: id };
  });

const MAX_DURATION_MS = 86_400_000; // 24h cap as a spam guard for client-supplied values

export const updateFormVisit = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      visitId: z.string().uuid(),
      didStartForm: z.boolean().optional(),
      didSubmit: z.boolean().optional(),
      submissionId: z.string().uuid().nullish(),
      visitEndedAt: z.string().datetime().nullish(),
      durationMs: z.number().int().nonnegative().max(MAX_DURATION_MS).nullish(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const updates: Partial<typeof formVisits.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.didStartForm !== undefined) {
      updates.didStartForm = data.didStartForm;
    }
    if (data.didSubmit !== undefined) {
      updates.didSubmit = data.didSubmit;
    }
    if (data.submissionId !== undefined) {
      updates.submissionId = data.submissionId;
    }
    if (data.visitEndedAt !== undefined) {
      updates.visitEndedAt = data.visitEndedAt ? new Date(data.visitEndedAt) : null;
    }
    if (data.durationMs !== undefined) {
      updates.durationMs = data.durationMs;
    }

    // No-op if no rows match (visit was a bot or rejected upstream).
    await db.update(formVisits).set(updates).where(eq(formVisits.id, data.visitId));
    return { ok: true };
  });

export const recordQuestionProgress = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      visitId: z.string().uuid(),
      formId: z.string().uuid(),
      visitorHash: z.string().min(1).max(128),
      questionId: z.string().min(1).max(256),
      questionType: z.string().max(64).nullish(),
      questionIndex: z.number().int().nonnegative(),
      event: z.enum(["view", "start", "complete"]),
      wasLastQuestion: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    // NOTE: race-prone if a single visitor fires multiple events simultaneously.
    // V1 acceptable: duplicates inflate progress rows but aggregation in Task 12
    // dedupes by max(viewedAt) per (visitorHash, questionId). A unique constraint
    // on (visitId, questionId) would be the right v2 fix.
    const [existing] = await db
      .select()
      .from(formQuestionProgress)
      .where(
        and(
          eq(formQuestionProgress.visitId, data.visitId),
          eq(formQuestionProgress.questionId, data.questionId),
        ),
      )
      .limit(1);

    const now = new Date();

    if (!existing) {
      const isStartOrComplete = data.event === "start" || data.event === "complete";
      await db.insert(formQuestionProgress).values({
        id: crypto.randomUUID(),
        visitId: data.visitId,
        formId: data.formId,
        visitorHash: data.visitorHash,
        questionId: data.questionId,
        questionType: data.questionType ?? null,
        questionIndex: data.questionIndex,
        viewedAt: now,
        startedAt: isStartOrComplete ? now : null,
        completedAt: data.event === "complete" ? now : null,
        wasLastQuestion: data.wasLastQuestion ?? false,
      });
      return { ok: true };
    }

    // Row exists: 'view' is a no-op (view is the earliest event in the lifecycle).
    const updates: Partial<typeof formQuestionProgress.$inferInsert> = {};
    if (data.event === "start" && !existing.startedAt) {
      updates.startedAt = now;
    }
    if (data.event === "complete") {
      updates.completedAt = now;
      if (!existing.startedAt) {
        updates.startedAt = now;
      }
    }
    if (data.wasLastQuestion !== undefined) {
      updates.wasLastQuestion = data.wasLastQuestion;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(formQuestionProgress)
        .set(updates)
        .where(eq(formQuestionProgress.id, existing.id));
    }
    return { ok: true };
  });

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getFormInsights = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      filter: z.enum(["last_24_hours", "last_7_days", "last_30_days", "last_90_days", "custom"]),
      startDate: z.string().regex(DATE_KEY_PATTERN).optional(),
      endDate: z.string().regex(DATE_KEY_PATTERN).optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<FormInsightsMetrics> => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);

    const now = new Date();
    const range = resolveTimeRange(
      { filter: data.filter, startDate: data.startDate, endDate: data.endDate },
      now,
    );
    const split = splitTodayVsPast(range, now);

    const dailyRows =
      split.pastDays.length > 0
        ? await db
            .select()
            .from(formAnalyticsDaily)
            .where(
              and(
                eq(formAnalyticsDaily.formId, data.formId),
                inArray(formAnalyticsDaily.date, split.pastDays),
              ),
            )
        : [];

    const todayRawRows = split.rawStart
      ? await db
          .select()
          .from(formVisits)
          .where(
            and(
              eq(formVisits.formId, data.formId),
              gte(formVisits.visitStartedAt, split.rawStart),
              lte(formVisits.visitStartedAt, range.end),
            ),
          )
      : [];

    return mergeInsightsMetrics({
      dailyRows,
      todayRawRows,
      startDate: data.startDate ?? toDateKey(range.start),
      endDate: data.endDate ?? toDateKey(range.end),
      days: range.days,
      todayKey: split.todayStart ? toDateKey(split.todayStart) : null,
    });
  });

export const getFormDropoff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      filter: z.enum(["last_24_hours", "last_7_days", "last_30_days", "last_90_days", "custom"]),
      startDate: z.string().regex(DATE_KEY_PATTERN).optional(),
      endDate: z.string().regex(DATE_KEY_PATTERN).optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<QuestionDropoffMetrics> => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);

    const now = new Date();
    const range = resolveTimeRange(
      { filter: data.filter, startDate: data.startDate, endDate: data.endDate },
      now,
    );
    const split = splitTodayVsPast(range, now);

    const dailyRows =
      split.pastDays.length > 0
        ? await db
            .select()
            .from(formDropoffDaily)
            .where(
              and(
                eq(formDropoffDaily.formId, data.formId),
                inArray(formDropoffDaily.date, split.pastDays),
              ),
            )
        : [];

    const todayProgressRows = split.rawStart
      ? await db
          .select()
          .from(formQuestionProgress)
          .where(
            and(
              eq(formQuestionProgress.formId, data.formId),
              gte(formQuestionProgress.viewedAt, split.rawStart),
              lte(formQuestionProgress.viewedAt, range.end),
            ),
          )
      : [];

    return mergeDropoffMetrics({
      formId: data.formId,
      startDate: data.startDate ?? toDateKey(range.start),
      endDate: data.endDate ?? toDateKey(range.end),
      dailyRows,
      todayProgressRows,
    });
  });

const DAYS_TO_RETAIN = 90;
const MS_PER_DAY = 86_400_000;
const RETENTION_MS = DAYS_TO_RETAIN * MS_PER_DAY;

interface AggregateResult {
  ok: true;
  date: string;
  analyticsRows: number;
  dropoffRows: number;
  pruned: { visits: number; progress: number };
}

/**
 * Idempotent nightly rollup.
 *
 * 1. Reads raw `formVisits` for the given UTC date and writes one
 *    `formAnalyticsDaily` row per `formId` (delete-then-insert for the date,
 *    so re-running for the same date never double-counts).
 * 2. Reads raw `formQuestionProgress` for the same UTC date and writes one
 *    `formDropoffDaily` row per (formId, questionId, questionIndex).
 * 3. Prunes raw rows older than 90 days from BOTH raw tables.
 *
 * Wrapped in a single DB transaction so partial failures don't leave half-
 * written aggregates. Drizzle does not return affected row counts from delete
 * statements consistently, so prune counts are reported as 0 in v1.
 */
export const aggregateAnalyticsDaily = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      date: z.string().regex(DATE_KEY_PATTERN),
    }),
  )
  .handler(async ({ data }): Promise<AggregateResult> => {
    const { date } = data;
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const now = new Date();
    const cutoff = new Date(now.getTime() - RETENTION_MS);

    const result = await db.transaction(async (tx) => {
      const visits = await tx
        .select()
        .from(formVisits)
        .where(
          and(gte(formVisits.visitStartedAt, dayStart), lte(formVisits.visitStartedAt, dayEnd)),
        );

      const progress = await tx
        .select()
        .from(formQuestionProgress)
        .where(
          and(
            gte(formQuestionProgress.viewedAt, dayStart),
            lte(formQuestionProgress.viewedAt, dayEnd),
          ),
        );

      const analyticsRows = buildDailyAnalyticsRows(visits, date, now);
      const dropoffRows = buildDailyDropoffRows(progress, date, now);

      // Idempotency: delete existing aggregate rows for this date, then insert
      // freshly computed ones.
      await tx.delete(formAnalyticsDaily).where(eq(formAnalyticsDaily.date, date));
      if (analyticsRows.length > 0) {
        await tx.insert(formAnalyticsDaily).values(analyticsRows);
      }

      await tx.delete(formDropoffDaily).where(eq(formDropoffDaily.date, date));
      if (dropoffRows.length > 0) {
        await tx.insert(formDropoffDaily).values(dropoffRows);
      }

      // Pruning (best-effort): remove raw rows older than retention window.
      await tx.delete(formVisits).where(lt(formVisits.visitStartedAt, cutoff));
      await tx.delete(formQuestionProgress).where(lt(formQuestionProgress.viewedAt, cutoff));

      return {
        analyticsRows: analyticsRows.length,
        dropoffRows: dropoffRows.length,
      };
    });

    return {
      ok: true,
      date,
      analyticsRows: result.analyticsRows,
      dropoffRows: result.dropoffRows,
      pruned: { visits: 0, progress: 0 },
    };
  });
