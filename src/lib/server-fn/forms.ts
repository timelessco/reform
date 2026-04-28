import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { customDomains, forms, member, submissions, workspaces } from "@/db/schema";
import { RESERVED_SLUGS } from "@/lib/config/plan-config";
import { db } from "@/db";
import { authMiddleware, formProSettingsMiddleware } from "@/lib/auth/middleware";
import { VERSIONED_SETTINGS_KEYS } from "@/lib/content-hash";
import { purgeFormCache } from "@/lib/server-fn/cdn-cache";
import { authForm, getActiveOrgId } from "./auth-helpers";
import { getOrgPlan } from "./plan-helpers";

// Columns the listings query must always return so client-side change detection
// (`useHasUnpublishedChanges`) keeps working after a refetch wipes the locally
// enriched record. The heavy `content` JSONB stays out and loads on demand
// via `enrichFormDetail`. Driven by `VERSIONED_SETTINGS_KEYS`
// so adding a new versioned column auto-flows here — no second list to keep
// in sync.
const versionedSettingColumns = Object.fromEntries(
  VERSIONED_SETTINGS_KEYS.map((key) => [key, forms[key as keyof typeof forms.$inferSelect]]),
) as { [K in (typeof VERSIONED_SETTINGS_KEYS)[number]]: (typeof forms)[K] };

const serializeForm = (form: typeof forms.$inferSelect) => ({
  ...form,
  createdAt: form.createdAt.toISOString(),
  updatedAt: form.updatedAt.toISOString(),
  deletedAt: form.deletedAt?.toISOString() ?? null,
  content: form.content as object[],
  settings: form.settings as Record<string, object>,
  customization: (form.customization ?? {}) as Record<string, object>,
});

export const createForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware, formProSettingsMiddleware])
  .inputValidator(
    z.object({
      id: z.uuid(),
      workspaceId: z.uuid(),
      title: z.string().optional(),
      formName: z.string().optional(),
      schemaName: z.string().optional(),
      content: z.array(z.unknown()).optional(),
      settings: z.unknown().optional(),
      icon: z.string().nullable().optional(),
      cover: z.string().nullable().optional(),
      isMultiStep: z.boolean().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      // Form settings fields (all optional with defaults)
      language: z.string().optional(),
      redirectOnCompletion: z.boolean().optional(),
      redirectUrl: z.string().nullable().optional(),
      redirectDelay: z.number().optional(),
      progressBar: z.boolean().optional(),
      presentationMode: z.enum(["card", "field-by-field"]).optional(),
      branding: z.boolean().optional(),
      analytics: z.boolean().optional(),
      saveAnswersForLater: z.boolean().optional(),
      selfEmailNotifications: z.boolean().optional(),
      notificationEmail: z.string().nullable().optional(),
      respondentEmailNotifications: z.boolean().optional(),
      respondentEmailSubject: z.string().nullable().optional(),
      respondentEmailBody: z.string().nullable().optional(),
      passwordProtect: z.boolean().optional(),
      password: z.string().nullable().optional(),
      closeForm: z.boolean().optional(),
      closedFormMessage: z.string().nullable().optional(),
      closeOnDate: z.boolean().optional(),
      closeDate: z.string().nullable().optional(),
      limitSubmissions: z.boolean().optional(),
      maxSubmissions: z.number().nullable().optional(),
      preventDuplicateSubmissions: z.boolean().optional(),
      dataRetention: z.boolean().optional(),
      dataRetentionDays: z.number().nullable().optional(),
      customization: z.record(z.string(), z.unknown()).optional(),
      sortIndex: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const now = new Date();
    const [form] = await db
      .insert(forms)
      .values({
        id: data.id,
        createdByUserId: context.session.user.id,
        workspaceId: data.workspaceId,
        title: data.title ?? "Untitled",
        formName: data.formName ?? "draft",
        schemaName: data.schemaName ?? "draftFormSchema",
        content: data.content ?? [],
        settings: data.settings ?? {},
        icon: data.icon,
        cover: data.cover,
        isMultiStep: data.isMultiStep ?? false,
        status: data.status ?? "draft",
        // Form settings fields
        language: data.language,
        redirectOnCompletion: data.redirectOnCompletion,
        redirectUrl: data.redirectUrl,
        redirectDelay: data.redirectDelay,
        progressBar: data.progressBar,
        presentationMode: data.presentationMode,
        branding: data.branding,
        analytics: data.analytics,
        saveAnswersForLater: data.saveAnswersForLater,
        selfEmailNotifications: data.selfEmailNotifications,
        notificationEmail: data.notificationEmail,
        respondentEmailNotifications: data.respondentEmailNotifications,
        respondentEmailSubject: data.respondentEmailSubject,
        respondentEmailBody: data.respondentEmailBody,
        passwordProtect: data.passwordProtect,
        password: data.password,
        closeForm: data.closeForm,
        closedFormMessage: data.closedFormMessage,
        closeOnDate: data.closeOnDate,
        closeDate: data.closeDate,
        limitSubmissions: data.limitSubmissions,
        maxSubmissions: data.maxSubmissions,
        preventDuplicateSubmissions: data.preventDuplicateSubmissions,
        dataRetention: data.dataRetention,
        dataRetentionDays: data.dataRetentionDays,
        customization: data.customization,
        sortIndex: data.sortIndex,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return { form: serializeForm(form) };
  });

export const updateForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware, formProSettingsMiddleware])
  .inputValidator(
    z.object({
      id: z.uuid(),
      workspaceId: z.uuid().optional(),
      title: z.string().optional(),
      formName: z.string().optional(),
      schemaName: z.string().optional(),
      content: z.array(z.unknown()).optional(),
      settings: z.unknown().optional(),
      icon: z.string().nullable().optional(),
      cover: z.string().nullable().optional(),
      isMultiStep: z.boolean().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      updatedAt: z.string().optional(),
      // Form settings fields
      language: z.string().optional(),
      redirectOnCompletion: z.boolean().optional(),
      redirectUrl: z.string().nullable().optional(),
      redirectDelay: z.number().optional(),
      progressBar: z.boolean().optional(),
      presentationMode: z.enum(["card", "field-by-field"]).optional(),
      branding: z.boolean().optional(),
      analytics: z.boolean().optional(),
      saveAnswersForLater: z.boolean().optional(),
      selfEmailNotifications: z.boolean().optional(),
      notificationEmail: z.string().nullable().optional(),
      respondentEmailNotifications: z.boolean().optional(),
      respondentEmailSubject: z.string().nullable().optional(),
      respondentEmailBody: z.string().nullable().optional(),
      passwordProtect: z.boolean().optional(),
      password: z.string().nullable().optional(),
      closeForm: z.boolean().optional(),
      closedFormMessage: z.string().nullable().optional(),
      closeOnDate: z.boolean().optional(),
      closeDate: z.string().nullable().optional(),
      limitSubmissions: z.boolean().optional(),
      maxSubmissions: z.number().nullable().optional(),
      preventDuplicateSubmissions: z.boolean().optional(),
      dataRetention: z.boolean().optional(),
      dataRetentionDays: z.number().nullable().optional(),
      customization: z.record(z.string(), z.unknown()).optional(),
      sortIndex: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { id, updatedAt: clientUpdatedAt, ...updateData } = data;
    const orgId = getActiveOrgId(context.session);
    await authForm(id, context.session.user.id, orgId);

    const [form] = await db
      .update(forms)
      .set({
        ...updateData,
        updatedAt: clientUpdatedAt ? new Date(clientUpdatedAt) : new Date(),
      })
      .where(eq(forms.id, id))
      .returning();

    // Live (non-versioned) fields that the public view reads — changes must
    // bust the CDN tag. Versioned fields can't be handled here; they change
    // the public response only on republish, which owns its own purge.
    if (updateData.branding !== undefined || updateData.analytics !== undefined) {
      void purgeFormCache(id);
    }

    return { form: serializeForm(form) };
  });

export const deleteForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.id, context.session.user.id, orgId);

    const [form] = await db.delete(forms).where(eq(forms.id, data.id)).returning();
    void purgeFormCache(data.id);

    return { form: serializeForm(form) };
  });

export const getFormListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const formList = await db
      .select({
        id: forms.id,
        title: forms.title,
        status: forms.status,
        updatedAt: forms.updatedAt,
        createdAt: forms.createdAt,
        workspaceId: forms.workspaceId,
        icon: forms.icon,
        cover: forms.cover,
        customization: forms.customization,
        formName: forms.formName,
        sortIndex: forms.sortIndex,
        submissionCount: count(submissions.id),
        // Hash-based change detection requires these on every listing fetch —
        // refetch after publish would otherwise wipe them off the local record.
        publishedContentHash: forms.publishedContentHash,
        lastPublishedVersionId: forms.lastPublishedVersionId,
        // Live (non-versioned) settings the share sidebar reads.
        branding: forms.branding,
        analytics: forms.analytics,
        slug: forms.slug,
        customDomainId: forms.customDomainId,
        // Every versioned settings column — needed so the client hash matches
        // the server hash even after the listings query refetches.
        ...versionedSettingColumns,
      })
      .from(forms)
      .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
      .innerJoin(member, eq(workspaces.organizationId, member.organizationId))
      .leftJoin(submissions, eq(submissions.formId, forms.id))
      .where(and(eq(member.userId, context.session.user.id), isNull(forms.deletedAt)))
      .groupBy(forms.id)
      .orderBy(forms.updatedAt);

    return formList.map((f) => ({
      ...f,
      updatedAt: f.updatedAt.toISOString(),
      createdAt: f.createdAt.toISOString(),
      customization: (f.customization ?? {}) as Record<string, string>,
    }));
  });

const _getFormById = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    const [_, [form]] = await Promise.all([
      authForm(data.id, context.session.user.id, orgId),
      db.select().from(forms).where(eq(forms.id, data.id)),
    ]);

    if (!form) {
      throw new Error("Form not found");
    }

    return { form: serializeForm(form) };
  });

export const getFormbyIdQueryOption = (formId: string) =>
  queryOptions({
    queryKey: ["forms", formId],
    queryFn: ({ signal }) => _getFormById({ data: { id: formId }, signal }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

export type FormStatus = "draft" | "published" | "archived";
type FormStatusQueryResult = {
  form?: {
    status?: FormStatus;
  };
};

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "form";

/** @public - consumed by upcoming domain settings UI */
export const updateFormSlug = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.uuid(), slug: z.string() }))
  .handler(async ({ data, context }) => {
    const { formId, slug } = data;
    const orgId = getActiveOrgId(context.session);
    await authForm(formId, context.session.user.id, orgId);

    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        "Invalid slug format. Use lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.",
      );
    }

    if (slug.length < 2 || slug.length > 60) {
      throw new Error("Slug must be between 2 and 60 characters");
    }

    if (RESERVED_SLUGS.has(slug)) {
      throw new Error("This slug is reserved and cannot be used");
    }

    // Look up the form to get its workspace, then the org
    const [formRecord] = await db
      .select({ workspaceId: forms.workspaceId })
      .from(forms)
      .where(eq(forms.id, formId));

    if (!formRecord) {
      throw new Error("Form not found");
    }

    const [workspace] = await db
      .select({ organizationId: workspaces.organizationId })
      .from(workspaces)
      .where(eq(workspaces.id, formRecord.workspaceId));

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Check uniqueness within the org
    const existing = await db
      .select({ id: forms.id })
      .from(forms)
      .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaces.organizationId, workspace.organizationId),
          eq(forms.slug, slug),
          ne(forms.id, formId),
        ),
      );

    if (existing.length > 0) {
      throw new Error("Slug already in use");
    }

    const [updatedForm] = await db
      .update(forms)
      .set({ slug, updatedAt: new Date() })
      .where(eq(forms.id, formId))
      .returning();

    return { form: serializeForm(updatedForm) };
  });

/** @public - consumed by upcoming domain settings UI */
export const assignFormDomain = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.uuid(),
      customDomainId: z.string().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { formId, customDomainId } = data;
    const orgId = getActiveOrgId(context.session);
    await authForm(formId, context.session.user.id, orgId);

    if (customDomainId !== null) {
      const plan = await getOrgPlan(orgId);
      if (plan === "free") {
        throw new Error("Custom domains require a Pro subscription. Please upgrade to continue.");
      }

      // Verify the domain exists and belongs to the same org
      const [domain] = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.id, customDomainId));

      if (!domain) {
        throw new Error("Custom domain not found");
      }

      if (domain.organizationId !== orgId) {
        throw new Error("Custom domain does not belong to this organization");
      }

      if (domain.status !== "verified") {
        throw new Error("Custom domain is not verified");
      }

      // If the form has no slug, auto-generate one from the title
      const [formRecord] = await db
        .select({ slug: forms.slug, title: forms.title })
        .from(forms)
        .where(eq(forms.id, formId));

      if (formRecord && !formRecord.slug) {
        let autoSlug = generateSlug(formRecord.title);

        // Check uniqueness within the org (same pattern as updateFormSlug)
        const existing = await db
          .select({ id: forms.id })
          .from(forms)
          .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
          .where(
            and(
              eq(workspaces.organizationId, orgId),
              eq(forms.slug, autoSlug),
              ne(forms.id, formId),
            ),
          );

        if (existing.length > 0) {
          autoSlug = `${autoSlug}-${formId.slice(0, 4)}`;
        }

        await db
          .update(forms)
          .set({ slug: autoSlug, updatedAt: new Date() })
          .where(eq(forms.id, formId));
      }
    }

    const [updatedForm] = await db
      .update(forms)
      .set({ customDomainId, updatedAt: new Date() })
      .where(eq(forms.id, formId))
      .returning();

    return { form: serializeForm(updatedForm) };
  });

export const getFormStatus = async (
  queryClient: import("@tanstack/react-query").QueryClient,
  formId: string,
): Promise<FormStatus | undefined> => {
  const result = (await queryClient.ensureQueryData({
    ...getFormbyIdQueryOption(formId),
    revalidateIfStale: true,
  })) as FormStatusQueryResult;

  return result.form?.status;
};
