import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { forms, formVersions, submissions } from "@/db/schema";
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
      return { form: null, error: "not_found" as const };
    }

    // If form has a published version, use version content
    if (form.lastPublishedVersionId) {
      const [version] = await db
        .select()
        .from(formVersions)
        .where(eq(formVersions.id, form.lastPublishedVersionId));

      if (version) {
        // Extract public settings from version settings
        const versionSettings = version.settings as Record<string, unknown> | null;
        const settings: PublicFormSettings = {
          progressBar: (versionSettings?.progressBar as boolean) ?? defaultPublicFormSettings.progressBar,
          branding: (versionSettings?.branding as boolean) ?? defaultPublicFormSettings.branding,
          autoJump: (versionSettings?.autoJump as boolean) ?? defaultPublicFormSettings.autoJump,
          saveAnswersForLater: (versionSettings?.saveAnswersForLater as boolean) ?? defaultPublicFormSettings.saveAnswersForLater,
          redirectOnCompletion: (versionSettings?.redirectOnCompletion as boolean) ?? defaultPublicFormSettings.redirectOnCompletion,
          redirectUrl: (versionSettings?.redirectUrl as string | null) ?? defaultPublicFormSettings.redirectUrl,
          redirectDelay: (versionSettings?.redirectDelay as number) ?? defaultPublicFormSettings.redirectDelay,
        };

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
        settings: defaultPublicFormSettings,
      },
      error: null,
    };
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
      })
      .from(forms)
      .where(eq(forms.id, data.formId));

    if (!form) {
      throw new Error("Form not found");
    }

    if (form.status !== "published") {
      throw new Error("Form is not accepting submissions");
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(submissions).values({
      id,
      formId: data.formId,
      formVersionId: form.lastPublishedVersionId, // Link to published version
      data: data.data,
      isCompleted: data.isCompleted,
      createdAt: now,
      updatedAt: now,
    });

    return { submissionId: id, success: true };
  });
