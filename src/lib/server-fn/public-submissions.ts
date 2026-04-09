import { createServerFn } from "@tanstack/react-start";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { forms, submissions, user } from "@/db/schema";
import { db } from "@/db";
import { recordOwnerSubmissionNotification } from "./notifications-helpers.server";

/**
 * Public submission endpoint (no authentication).
 * Validates the form is published and open, writes the submission,
 * and fires-and-forgets owner notifications + email.
 */
export const createPublicSubmission = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      data: z.record(z.string(), z.any()),
      isCompleted: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    // Verify form exists and is published, get the current published version ID + settings
    const [form] = await db
      .select({
        status: forms.status,
        lastPublishedVersionId: forms.lastPublishedVersionId,
        createdByUserId: forms.createdByUserId,
        // Settings fields for gating + email
        closeForm: forms.closeForm,
        closeOnDate: forms.closeOnDate,
        closeDate: forms.closeDate,
        limitSubmissions: forms.limitSubmissions,
        maxSubmissions: forms.maxSubmissions,
        selfEmailNotifications: forms.selfEmailNotifications,
        notificationEmail: forms.notificationEmail,
        respondentEmailNotifications: forms.respondentEmailNotifications,
        respondentEmailSubject: forms.respondentEmailSubject,
        respondentEmailBody: forms.respondentEmailBody,
      })
      .from(forms)
      .where(eq(forms.id, data.formId));

    if (!form) {
      throw new Error("Form not found");
    }

    if (form.status !== "published") {
      throw new Error("Form is not accepting submissions");
    }

    // --- Server-side gating (prevent client-side bypass) ---
    if (form.closeForm) {
      throw new Error("This form is closed");
    }
    if (form.closeOnDate && form.closeDate && new Date(form.closeDate) < new Date()) {
      throw new Error("This form is no longer accepting responses");
    }
    if (form.limitSubmissions && form.maxSubmissions) {
      const [{ value: submissionCount }] = await db
        .select({ value: count() })
        .from(submissions)
        .where(eq(submissions.formId, data.formId));
      if (submissionCount >= form.maxSubmissions) {
        throw new Error("This form has reached its maximum number of submissions");
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(submissions).values({
      id,
      formId: data.formId,
      formVersionId: form.lastPublishedVersionId,
      data: data.data,
      isCompleted: data.isCompleted,
      createdAt: now,
      updatedAt: now,
    });

    // Fire-and-forget: don't block submission response for notification bookkeeping
    recordOwnerSubmissionNotification({
      formId: data.formId,
      userId: form.createdByUserId,
      submissionId: id,
      createdAt: now,
    }).catch(() => {});

    // Fire-and-forget email notifications
    sendEmailNotifications(
      {
        selfEmailNotifications: form.selfEmailNotifications,
        notificationEmail: form.notificationEmail,
        respondentEmailNotifications: form.respondentEmailNotifications,
        respondentEmailSubject: form.respondentEmailSubject,
        respondentEmailBody: form.respondentEmailBody,
      },
      form.createdByUserId,
      data.formId,
      id,
      data.data,
    ).catch((err) => console.error("[Email] Notification error:", err));

    return { submissionId: id, success: true };
  });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Find a respondent's email from submission data.
 * Priority: keys containing "email" first, then any email-like string value.
 */
const findRespondentEmail = (data: Record<string, unknown>): string | null => {
  for (const [key, value] of Object.entries(data)) {
    if (key.toLowerCase().includes("email") && typeof value === "string" && value.includes("@")) {
      return value;
    }
  }
  for (const value of Object.values(data)) {
    if (typeof value === "string" && EMAIL_REGEX.test(value)) {
      return value;
    }
  }
  return null;
};

interface EmailNotificationSettings {
  selfEmailNotifications: boolean;
  notificationEmail: string | null;
  respondentEmailNotifications: boolean;
  respondentEmailSubject: string | null;
  respondentEmailBody: string | null;
}

/**
 * Send email notifications after form submission (fire-and-forget).
 */
const sendEmailNotifications = async (
  settings: EmailNotificationSettings,
  createdByUserId: string,
  formId: string,
  submissionId: string,
  submissionData: Record<string, unknown>,
) => {
  const { sendFormSubmissionNotification, sendRespondentConfirmation } =
    await import("@/integrations/email");

  // Self email notification
  if (settings.selfEmailNotifications) {
    let toEmail = settings.notificationEmail;

    // Fallback to form owner's email
    if (!toEmail) {
      const [owner] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, createdByUserId));
      toEmail = owner?.email ?? null;
    }

    if (toEmail) {
      const [formRow] = await db
        .select({ title: forms.title })
        .from(forms)
        .where(eq(forms.id, formId));
      sendFormSubmissionNotification(
        toEmail,
        formRow?.title ?? "Untitled Form",
        submissionId,
        submissionData,
      ).catch((err) => console.error("[Email] Self notification error:", err));
    }
  }

  // Respondent email notification
  if (settings.respondentEmailNotifications) {
    const respondentEmail = findRespondentEmail(submissionData);
    if (respondentEmail) {
      const subject = settings.respondentEmailSubject || "Thank you for your submission";
      const body =
        settings.respondentEmailBody ||
        "Thank you for filling out our form. We have received your response.";
      sendRespondentConfirmation(respondentEmail, subject, body).catch((err) =>
        console.error("[Email] Respondent notification error:", err),
      );
    }
  }
};
