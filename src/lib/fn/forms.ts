import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { forms, member, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { authForm, getTxId } from "./helpers";

const serializeForm = (form: typeof forms.$inferSelect) => ({
  ...form,
  createdAt: form.createdAt.toISOString(),
  updatedAt: form.updatedAt.toISOString(),
  content: form.content as Record<string, object>,
  settings: form.settings as Record<string, object>,
  customization: (form.customization ?? {}) as Record<string, string>,
});

const serializeFormListing = (form: typeof forms.$inferSelect) => ({
  id: form.id,
  title: form.title,
  status: form.status,
  updatedAt: form.updatedAt.toISOString(),
  createdAt: form.createdAt.toISOString(),
  workspaceId: form.workspaceId,
  icon: form.icon,
  formName: form.formName,
});

export const createForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      workspaceId: z.string().uuid(),
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
      branding: z.boolean().optional(),
      autoJump: z.boolean().optional(),
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
    }),
  )
  .handler(async ({ data, context }) => {
    const now = new Date();
    return await db.transaction(async (tx) => {
      const [form] = await tx
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
          branding: data.branding,
          autoJump: data.autoJump,
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
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const txid = await getTxId(tx);

      return { form: serializeForm(form), txid };
    });
  });

export const updateForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      workspaceId: z.string().uuid().optional(),
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
      branding: z.boolean().optional(),
      autoJump: z.boolean().optional(),
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
    }),
  )
  .handler(async ({ data, context }) => {
    const { id, updatedAt: clientUpdatedAt, ...updateData } = data;
    const authPromise = authForm(id, context.session.user.id);
    await authPromise;

    return await db.transaction(async (tx) => {
      const [form] = await tx
        .update(forms)
        .set({
          ...updateData,
          updatedAt: clientUpdatedAt ? new Date(clientUpdatedAt) : new Date(),
        })
        .where(eq(forms.id, id))
        .returning();

      const txid = await getTxId(tx);

      return { form: serializeForm(form), txid };
    });
  });

export const deleteForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const authPromise = authForm(data.id, context.session.user.id);
    await authPromise;

    return await db.transaction(async (tx) => {
      const [form] = await tx.delete(forms).where(eq(forms.id, data.id)).returning();

      const txid = await getTxId(tx);

      return { form: serializeForm(form), txid };
    });
  });

const _getFormsByWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const formList = await db
      .select()
      .from(forms)
      .where(
        and(
          eq(forms.workspaceId, data.workspaceId),
          eq(forms.createdByUserId, context.session.user.id),
        ),
      )
      .orderBy(forms.updatedAt);

    return { forms: formList.map(serializeFormListing) };
  });

export const duplicateForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const authPromise = authForm(data.id, context.session.user.id);

    // Get the original form (start fetch in parallel with auth)
    const [originalForm] = await db.select().from(forms).where(eq(forms.id, data.id));
    await authPromise;

    if (!originalForm) {
      throw new Error("Form not found");
    }

    const now = new Date();
    const newId = crypto.randomUUID();
    const title = originalForm.title ? `${originalForm.title} copy` : "Untitled copy";

    return await db.transaction(async (tx) => {
      const [newForm] = await tx
        .insert(forms)
        .values({
          id: newId,
          createdByUserId: context.session.user.id,
          workspaceId: originalForm.workspaceId,
          title,
          formName: originalForm.formName,
          schemaName: originalForm.schemaName,
          content: originalForm.content,
          settings: originalForm.settings,
          icon: originalForm.icon,
          cover: originalForm.cover,
          isMultiStep: originalForm.isMultiStep,
          status: originalForm.status,
          // Copy form settings fields from original
          language: originalForm.language,
          redirectOnCompletion: originalForm.redirectOnCompletion,
          redirectUrl: originalForm.redirectUrl,
          redirectDelay: originalForm.redirectDelay,
          progressBar: originalForm.progressBar,
          branding: originalForm.branding,
          autoJump: originalForm.autoJump,
          saveAnswersForLater: originalForm.saveAnswersForLater,
          selfEmailNotifications: originalForm.selfEmailNotifications,
          notificationEmail: originalForm.notificationEmail,
          respondentEmailNotifications: originalForm.respondentEmailNotifications,
          respondentEmailSubject: originalForm.respondentEmailSubject,
          respondentEmailBody: originalForm.respondentEmailBody,
          passwordProtect: originalForm.passwordProtect,
          password: originalForm.password,
          closeForm: originalForm.closeForm,
          closedFormMessage: originalForm.closedFormMessage,
          closeOnDate: originalForm.closeOnDate,
          closeDate: originalForm.closeDate,
          limitSubmissions: originalForm.limitSubmissions,
          maxSubmissions: originalForm.maxSubmissions,
          preventDuplicateSubmissions: originalForm.preventDuplicateSubmissions,
          dataRetention: originalForm.dataRetention,
          dataRetentionDays: originalForm.dataRetentionDays,
          customization: originalForm.customization,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const txid = await getTxId(tx);

      return { form: serializeForm(newForm), txid };
    });
  });

const _moveFormToWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      targetWorkspaceId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const authPromise = authForm(data.formId, context.session.user.id);
    await authPromise;

    return await db.transaction(async (tx) => {
      const [form] = await tx
        .update(forms)
        .set({
          workspaceId: data.targetWorkspaceId,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, data.formId))
        .returning();

      const txid = await getTxId(tx);

      return { form: serializeForm(form), txid };
    });
  });

const _getFormById = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const [_, [form]] = await Promise.all([
      authForm(data.id, context.session.user.id),
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

export const getNavigationForms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      organizationId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const formList = await db
      .select({
        id: forms.id,
        title: forms.title,
        status: forms.status,
        updatedAt: forms.updatedAt,
        createdAt: forms.createdAt,
        workspaceId: forms.workspaceId,
        icon: forms.icon,
        formName: forms.formName,
        customization: forms.customization,
      })
      .from(forms)
      .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
      .innerJoin(member, eq(workspaces.organizationId, member.organizationId))
      .where(
        and(
          eq(member.userId, context.session.user.id),
          eq(workspaces.organizationId, data.organizationId),
          or(eq(forms.status, "draft"), eq(forms.status, "published")),
        ),
      )
      .orderBy(forms.updatedAt);

    return {
      forms: formList.map((form) => ({
        ...form,
        title: form.title ?? "Untitled",
        updatedAt: form.updatedAt.toISOString(),
        createdAt: form.createdAt.toISOString(),
        customization: (form.customization ?? {}) as Record<string, string>,
      })),
    };
  });
