import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { forms, formVersions, submissions } from "@/db/schema";
import { db } from "@/db";
import type { PublicFormSettings } from "@/types/form-settings";

/**
 * Public server functions for viewing a form and verifying its password.
 * NO authentication required.
 */

/**
 * Get a published form by ID (public access).
 * Returns the published version content, not the draft content.
 * Only returns forms with status === "published".
 */
export const getPublishedFormById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Get form with its current published version and settings
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
        // Settings fields (now on forms table)
        progressBar: forms.progressBar,
        branding: forms.branding,
        autoJump: forms.autoJump,
        saveAnswersForLater: forms.saveAnswersForLater,
        redirectOnCompletion: forms.redirectOnCompletion,
        redirectUrl: forms.redirectUrl,
        redirectDelay: forms.redirectDelay,
        language: forms.language,
        passwordProtect: forms.passwordProtect,
        closeForm: forms.closeForm,
        closedFormMessage: forms.closedFormMessage,
        closeOnDate: forms.closeOnDate,
        closeDate: forms.closeDate,
        limitSubmissions: forms.limitSubmissions,
        maxSubmissions: forms.maxSubmissions,
        preventDuplicateSubmissions: forms.preventDuplicateSubmissions,
      })
      .from(forms)
      .where(and(eq(forms.id, data.id), eq(forms.status, "published")));

    if (!form) {
      throw notFound();
    }

    // Read settings directly from the form row
    const settings: PublicFormSettings = {
      progressBar: form.progressBar,
      branding: form.branding,
      autoJump: form.autoJump,
      saveAnswersForLater: form.saveAnswersForLater,
      redirectOnCompletion: form.redirectOnCompletion,
      redirectUrl: form.redirectUrl,
      redirectDelay: form.redirectDelay,
      language: form.language,
      passwordProtect: form.passwordProtect,
      closeForm: form.closeForm,
      closedFormMessage: form.closedFormMessage,
      closeOnDate: form.closeOnDate,
      closeDate: form.closeDate,
      limitSubmissions: form.limitSubmissions,
      maxSubmissions: form.maxSubmissions,
      preventDuplicateSubmissions: form.preventDuplicateSubmissions,
    };

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
            customization: (version.customization ?? {}) as Record<string, string>,
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
        customization: {} as Record<string, string>,
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
 * Verify a password for a password-protected form.
 */
export const verifyFormPassword = createServerFn({ method: "POST" })
  .inputValidator(z.object({ formId: z.string().uuid(), password: z.string() }))
  .handler(async ({ data }) => {
    const [formRow] = await db
      .select({ password: forms.password })
      .from(forms)
      .where(eq(forms.id, data.formId));

    if (!formRow) {
      return { valid: false };
    }

    return { valid: formRow.password === data.password };
  });
