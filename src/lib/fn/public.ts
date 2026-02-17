import { createServerFn } from "@tanstack/react-start";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { forms, formSettings, formVersions, submissions, user } from "@/db/schema";
import { db } from "@/lib/db";
import {
  type PublicFormSettings,
  defaultPublicFormSettings,
} from "@/types/form-settings";

/**
 * Public server functions - NO authentication required
 * Used for public form viewing and submission
 */

/**
 * Get a published form by ID (public access)
 * Returns the published version content, not the draft content
 * Only returns forms with status === "published"
 */
export const getPublishedFormById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Get form with its current published version
    const [form] = await db
      .select({
        id: forms.id,
        status: forms.status,
        icon: forms.icon,
        cover: forms.cover,
        lastPublishedVersionId: forms.lastPublishedVersionId,
        // Fallback fields for forms without versions (backward compatibility)
        draftTitle: forms.title,
        draftContent: forms.content,
      })
      .from(forms)
      .where(and(eq(forms.id, data.id), eq(forms.status, "published")));

    if (!form) {
      return { form: null, error: "not_found" as const, gated: null };
    }

    // Fetch live settings from form_settings table (source of truth)
    const [settingsRow] = await db
      .select()
      .from(formSettings)
      .where(eq(formSettings.formId, data.id));

    const settings: PublicFormSettings = settingsRow
      ? {
          progressBar: settingsRow.progressBar,
          branding: settingsRow.branding,
          autoJump: settingsRow.autoJump,
          saveAnswersForLater: settingsRow.saveAnswersForLater,
          redirectOnCompletion: settingsRow.redirectOnCompletion,
          redirectUrl: settingsRow.redirectUrl,
          redirectDelay: settingsRow.redirectDelay,
          language: settingsRow.language,
          passwordProtect: settingsRow.passwordProtect,
          closeForm: settingsRow.closeForm,
          closedFormMessage: settingsRow.closedFormMessage,
          closeOnDate: settingsRow.closeOnDate,
          closeDate: settingsRow.closeDate,
          limitSubmissions: settingsRow.limitSubmissions,
          maxSubmissions: settingsRow.maxSubmissions,
          preventDuplicateSubmissions: settingsRow.preventDuplicateSubmissions,
        }
      : defaultPublicFormSettings;

    // --- Gating checks ---
    // 1. Form manually closed
    if (settings.closeForm) {
      return {
        form: null,
        error: null,
        gated: {
          type: "closed" as const,
          message: settings.closedFormMessage || "This form is now closed.",
        },
      };
    }

    // 2. Close on scheduled date
    if (settings.closeOnDate && settings.closeDate && new Date(settings.closeDate) < new Date()) {
      return {
        form: null,
        error: null,
        gated: {
          type: "date_expired" as const,
          message: settings.closedFormMessage || "This form is no longer accepting responses.",
        },
      };
    }

    // 3. Submission limit reached
    if (settings.limitSubmissions && settings.maxSubmissions) {
      const [{ value: submissionCount }] = await db
        .select({ value: count() })
        .from(submissions)
        .where(eq(submissions.formId, data.id));
      if (submissionCount >= settings.maxSubmissions) {
        return {
          form: null,
          error: null,
          gated: {
            type: "limit_reached" as const,
            message: "This form has reached its maximum number of submissions.",
          },
        };
      }
    }

    // 4. Password protection — return form data but flag as gated
    // NEVER send password to client
    const gated = settings.passwordProtect
      ? { type: "password_required" as const, message: null }
      : null;

    // If form has a published version, use version content
    if (form.lastPublishedVersionId) {
      const [version] = await db
        .select()
        .from(formVersions)
        .where(eq(formVersions.id, form.lastPublishedVersionId));

      if (version) {
        return {
          form: {
            id: form.id,
            title: version.title,
            content: version.content as object[],
            icon: form.icon,
            cover: form.cover,
            status: form.status,
            settings,
          },
          error: null,
          gated,
        };
      }
    }

    // Fallback for forms without versions (backward compatibility)
    return {
      form: {
        id: form.id,
        title: form.draftTitle,
        content: form.draftContent as object[],
        icon: form.icon,
        cover: form.cover,
        status: form.status,
        settings,
      },
      error: null,
      gated: null,
    };
  });

/**
 * Verify a password for a password-protected form
 */
export const verifyFormPassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ formId: z.string().uuid(), password: z.string() }))
  .handler(async ({ data }) => {
    // Read password from form_settings table (live, not version snapshot)
    const [settingsRow] = await db
      .select({ password: formSettings.password })
      .from(formSettings)
      .where(eq(formSettings.formId, data.formId));

    if (!settingsRow) {
      return { valid: false };
    }

    return { valid: settingsRow.password === data.password };
  });

/**
 * Create a submission for a published form (public access)
 * Validates that the form is published before accepting submission
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
    // Verify form exists and is published, get the current published version ID
    const [form] = await db
      .select({
        status: forms.status,
        lastPublishedVersionId: forms.lastPublishedVersionId,
        createdByUserId: forms.createdByUserId,
      })
      .from(forms)
      .where(eq(forms.id, data.formId));

    if (!form) {
      throw new Error("Form not found");
    }

    if (form.status !== "published") {
      throw new Error("Form is not accepting submissions");
    }

    // Fetch live settings from form_settings table for gating + email
    const [settingsRow] = await db
      .select()
      .from(formSettings)
      .where(eq(formSettings.formId, data.formId));

    // --- Server-side gating (prevent client-side bypass) ---
    if (settingsRow) {
      // Close form
      if (settingsRow.closeForm) {
        throw new Error("This form is closed");
      }
      // Close on date
      if (settingsRow.closeOnDate && settingsRow.closeDate && new Date(settingsRow.closeDate) < new Date()) {
        throw new Error("This form is no longer accepting responses");
      }
      // Submission limit
      if (settingsRow.limitSubmissions && settingsRow.maxSubmissions) {
        const [{ value: submissionCount }] = await db
          .select({ value: count() })
          .from(submissions)
          .where(eq(submissions.formId, data.formId));
        if (submissionCount >= settingsRow.maxSubmissions) {
          throw new Error("This form has reached its maximum number of submissions");
        }
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

    // Fire-and-forget email notifications
    if (settingsRow) {
      const settingsForEmail: Record<string, unknown> = {
        selfEmailNotifications: settingsRow.selfEmailNotifications,
        notificationEmail: settingsRow.notificationEmail,
        respondentEmailNotifications: settingsRow.respondentEmailNotifications,
        respondentEmailSubject: settingsRow.respondentEmailSubject,
        respondentEmailBody: settingsRow.respondentEmailBody,
      };
      sendEmailNotifications(settingsForEmail, form.createdByUserId, data.formId, id, data.data).catch(
        (err) => console.error("[Email] Notification error:", err),
      );
    }

    return { submissionId: id, success: true };
  });

/**
 * Find a respondent's email from submission data.
 * Priority: keys containing "email" first, then any email-like string value.
 */
function findRespondentEmail(data: Record<string, unknown>): string | null {
  // First pass: look for keys containing "email"
  for (const [key, value] of Object.entries(data)) {
    if (key.toLowerCase().includes("email") && typeof value === "string" && value.includes("@")) {
      return value;
    }
  }
  // Second pass: look for any email-like value
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const value of Object.values(data)) {
    if (typeof value === "string" && emailRegex.test(value)) {
      return value;
    }
  }
  return null;
}

/**
 * Send email notifications after form submission (fire-and-forget)
 */
async function sendEmailNotifications(
  settings: Record<string, unknown>,
  createdByUserId: string,
  formId: string,
  submissionId: string,
  submissionData: Record<string, unknown>,
) {
  const { sendFormSubmissionNotification, sendRespondentConfirmation } = await import("@/lib/email");

  // Self email notification
  if (settings.selfEmailNotifications === true) {
    let toEmail = settings.notificationEmail as string | null;

    // Fallback to form owner's email
    if (!toEmail) {
      const [owner] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, createdByUserId));
      toEmail = owner?.email ?? null;
    }

    if (toEmail) {
      // Get form title for the email
      const [formRow] = await db.select({ title: forms.title }).from(forms).where(eq(forms.id, formId));
      sendFormSubmissionNotification(toEmail, formRow?.title ?? "Untitled Form", submissionId, submissionData).catch(
        (err) => console.error("[Email] Self notification error:", err),
      );
    }
  }

  // Respondent email notification
  if (settings.respondentEmailNotifications === true) {
    const respondentEmail = findRespondentEmail(submissionData);
    if (respondentEmail) {
      const subject = (settings.respondentEmailSubject as string) || "Thank you for your submission";
      const body = (settings.respondentEmailBody as string) || "Thank you for filling out our form. We have received your response.";
      sendRespondentConfirmation(respondentEmail, subject, body).catch(
        (err) => console.error("[Email] Respondent notification error:", err),
      );
    }
  }
}
