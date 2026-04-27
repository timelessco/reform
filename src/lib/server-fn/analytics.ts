import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  formAnalyticsDaily,
  formDropoffDaily,
  formQuestionProgress,
  formVisits,
} from "@/db/schema";
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
    const ua = (headers["user-agent"] as string | undefined) ?? null;

    if (isBotUserAgent(ua)) {
      return { visitId: null };
    }

    const parsed = parseUserAgent(ua);
    const country = (headers["x-vercel-ip-country"] as string | undefined) ?? null;

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
