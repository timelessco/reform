import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { forms } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { authForm, authUser, getTxId } from "./helpers";

const serializeForm = (form: typeof forms.$inferSelect) => ({
  ...form,
  createdAt: form.createdAt.toISOString(),
  updatedAt: form.updatedAt.toISOString(),
  content: form.content as any,
  settings: form.settings as any,
});

export const createForm = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      workspaceId: z.string().uuid(),
      title: z.string().optional(),
      formName: z.string().optional(),
      schemaName: z.string().optional(),
      content: z.array(z.any()).optional(),
      settings: z.any().optional(),
      icon: z.string().nullable().optional(),
      cover: z.string().nullable().optional(),
      isMultiStep: z.boolean().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
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
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const txid = await getTxId();

    return { form: serializeForm(form), txid };
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
      content: z.array(z.any()).optional(),
      settings: z.any().optional(),
      icon: z.string().nullable().optional(),
      cover: z.string().nullable().optional(),
      isMultiStep: z.boolean().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      updatedAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { id, updatedAt: clientUpdatedAt, ...updateData } = data;
    await authForm(id);

    const [form] = await db
      .update(forms)
      .set({
        ...updateData,
        updatedAt: clientUpdatedAt ? new Date(clientUpdatedAt) : new Date(),
      })
      .where(eq(forms.id, id))
      .returning();

    const txid = await getTxId();

    return { form: serializeForm(form), txid };
  });

export const deleteForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await authForm(data.id);

    const [form] = await db.delete(forms).where(eq(forms.id, data.id)).returning();

    const txid = await getTxId();

    return { form: serializeForm(form), txid };
  });

export const getFormsByWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await authUser(); // Just check authentication

    const formList = await db
      .select()
      .from(forms)
      .where(eq(forms.workspaceId, data.workspaceId))
      .orderBy(forms.updatedAt);

    return { forms: formList.map(serializeForm) };
  });

export const duplicateForm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await authUser();
    await authForm(data.id);

    // Get the original form
    const [originalForm] = await db.select().from(forms).where(eq(forms.id, data.id));

    if (!originalForm) {
      throw new Error("Form not found");
    }

    const now = new Date();
    const newId = crypto.randomUUID();
    const title = originalForm.title ? `${originalForm.title} copy` : "Untitled copy";

    const [newForm] = await db
      .insert(forms)
      .values({
        id: newId,
        createdByUserId: user.id,
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
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const txid = await getTxId();

    return { form: serializeForm(newForm), txid };
  });

export const moveFormToWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      targetWorkspaceId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await authForm(data.formId);

    const [form] = await db
      .update(forms)
      .set({
        workspaceId: data.targetWorkspaceId,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, data.formId))
      .returning();

    const txid = await getTxId();

    return { form: serializeForm(form), txid };
  });

export const getFormById = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await authForm(data.id);

    const [form] = await db.select().from(forms).where(eq(forms.id, data.id));

    if (!form) {
      throw new Error("Form not found");
    }

    return { form: serializeForm(form) };
  });

export const getFormbyIdQueryOption = (formId: string) =>
  queryOptions({
    queryKey: ["forms", formId],
    queryFn: ({ signal }) => getFormById({ data: { id: formId }, signal }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
