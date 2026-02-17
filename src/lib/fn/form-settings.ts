import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { formSettings } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { getTxId } from "./helpers";

export const updateFormSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
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
      updatedAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { id, updatedAt: _clientUpdatedAt, ...updateData } = data;

    await db
      .update(formSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(formSettings.id, id));

    const txid = await getTxId();
    return { txid };
  });
