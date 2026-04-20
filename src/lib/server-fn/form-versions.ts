import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { forms, formVersions, user } from "@/db/schema";
import { db } from "@/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { computeContentHash } from "@/lib/content-hash";
import { authForm, getActiveOrgId } from "./auth-helpers";

// Maximum number of versions to keep per form (TODO: make plan-based)
const MAX_VERSIONS_PER_FORM = 20;

const serializeVersion = (version: typeof formVersions.$inferSelect) => ({
  ...version,
  publishedAt: version.publishedAt.toISOString(),
  createdAt: version.createdAt.toISOString(),
  content: version.content as object[],
  settings: version.settings as Record<string, object>,
  customization: (version.customization ?? {}) as Record<string, string>,
});

/**
 * Publish the current form draft as a new version
 */
export const publishFormVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);

    return await db.transaction(async (tx) => {
      // Get current form draft
      const [form] = await tx.select().from(forms).where(eq(forms.id, data.formId));

      if (!form) {
        throw new Error("Form not found");
      }

      // Get latest version info
      const [lastVersion] = await tx
        .select({ id: formVersions.id, version: formVersions.version })
        .from(formVersions)
        .where(eq(formVersions.formId, data.formId))
        .orderBy(desc(formVersions.version))
        .limit(1);

      const nextVersionNumber = (lastVersion?.version ?? 0) + 1;
      const now = new Date();

      // Snapshot Group 2 behavior settings (flat columns) into the version's
      // settings jsonb so the public endpoint can read them from the snapshot
      // instead of the live forms row. Group 4 (slug, customDomainId, branding)
      // is intentionally excluded — those stay live.
      const settingsSnapshot = {
        progressBar: form.progressBar,
        autoJump: form.autoJump,
        saveAnswersForLater: form.saveAnswersForLater,
        redirectOnCompletion: form.redirectOnCompletion,
        redirectUrl: form.redirectUrl,
        redirectDelay: form.redirectDelay,
        language: form.language,
        passwordProtect: form.passwordProtect,
        password: form.password,
        closeForm: form.closeForm,
        closedFormMessage: form.closedFormMessage,
        closeOnDate: form.closeOnDate,
        closeDate: form.closeDate,
        limitSubmissions: form.limitSubmissions,
        maxSubmissions: form.maxSubmissions,
        preventDuplicateSubmissions: form.preventDuplicateSubmissions,
        selfEmailNotifications: form.selfEmailNotifications,
        notificationEmail: form.notificationEmail,
        respondentEmailNotifications: form.respondentEmailNotifications,
        respondentEmailSubject: form.respondentEmailSubject,
        respondentEmailBody: form.respondentEmailBody,
        dataRetention: form.dataRetention,
        dataRetentionDays: form.dataRetentionDays,
      };

      const contentHash = computeContentHash({
        content: form.content,
        customization: form.customization ?? {},
        title: form.title,
        icon: form.icon,
        cover: form.cover,
        settings: settingsSnapshot,
      });

      // Create version snapshot
      const versionId = crypto.randomUUID();

      const [newVersion] = await tx
        .insert(formVersions)
        .values({
          id: versionId,
          formId: data.formId,
          version: nextVersionNumber,
          content: form.content,
          settings: settingsSnapshot,
          customization: form.customization ?? {},
          title: form.title,
          icon: form.icon,
          cover: form.cover,
          publishedByUserId: context.session.user.id,
          publishedAt: now,
          createdAt: now,
        })
        .returning();

      // Update form with new version reference, editor snapshot, and hash
      await tx
        .update(forms)
        .set({
          content: form.content,
          title: form.title,
          settings: form.settings,
          status: "published",
          lastPublishedVersionId: versionId,
          publishedContentHash: contentHash,
          updatedAt: now,
        })
        .where(eq(forms.id, data.formId));

      // Delete old versions beyond limit (keep last MAX_VERSIONS_PER_FORM)
      const allVersions = await tx
        .select({ id: formVersions.id })
        .from(formVersions)
        .where(eq(formVersions.formId, data.formId))
        .orderBy(desc(formVersions.version));

      if (allVersions.length > MAX_VERSIONS_PER_FORM) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS_PER_FORM).map((v) => v.id);
        await tx.delete(formVersions).where(inArray(formVersions.id, versionsToDelete));
      }

      return {
        version: serializeVersion(newVersion),
        versionNumber: nextVersionNumber,
      };
    });
  });

/**
 * Get list of published versions for a form
 */
export const getFormVersions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    const [_, versions] = await Promise.all([
      authForm(data.formId, context.session.user.id, orgId),
      db
        .select({
          id: formVersions.id,
          version: formVersions.version,
          title: formVersions.title,
          publishedAt: formVersions.publishedAt,
          publishedByUserId: formVersions.publishedByUserId,
          publishedByName: user.name,
          publishedByImage: user.image,
        })
        .from(formVersions)
        .leftJoin(user, eq(formVersions.publishedByUserId, user.id))
        .where(eq(formVersions.formId, data.formId))
        .orderBy(desc(formVersions.version)),
    ]);

    return {
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        title: v.title,
        publishedAt: v.publishedAt.toISOString(),
        publishedBy: {
          id: v.publishedByUserId,
          name: v.publishedByName,
          image: v.publishedByImage,
        },
      })),
    };
  });

/**
 * Get full content of a specific version for preview
 */
export const getFormVersionContent = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ versionId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    // Get the version
    const [version] = await db
      .select()
      .from(formVersions)
      .where(eq(formVersions.id, data.versionId));

    if (!version) {
      throw new Error("Version not found");
    }

    const orgId = getActiveOrgId(context.session);
    await authForm(version.formId, context.session.user.id, orgId);

    return { version: serializeVersion(version) };
  });

/**
 * Restore a version's content to the form draft
 * Note: Does NOT update publishedContentHash to keep "has changes" state
 */
export const restoreFormVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      formId: z.string().uuid(),
      versionId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    const authPromise = authForm(data.formId, context.session.user.id, orgId);

    // Get the version (start fetch in parallel with auth)
    const [version] = await db
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.id, data.versionId), eq(formVersions.formId, data.formId)));
    await authPromise;

    if (!version) {
      throw new Error("Version not found");
    }

    // Update form draft with version content + customization
    // Note: We don't update publishedContentHash so the form shows "has changes"
    await db
      .update(forms)
      .set({
        content: version.content,
        title: version.title,
        customization: version.customization ?? {},
        updatedAt: new Date(),
      })
      .where(eq(forms.id, data.formId));

    return {
      success: true,
      version: {
        content: version.content as object[],
        settings: version.settings as Record<string, object>,
        title: version.title,
      },
    };
  });

/**
 * Discard all changes and revert to last published version
 */
export const discardFormChanges = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = getActiveOrgId(context.session);
    await authForm(data.formId, context.session.user.id, orgId);

    // Get the form with its last published version in a single query
    const [result] = await db
      .select({
        lastPublishedVersionId: forms.lastPublishedVersionId,
        version: formVersions,
      })
      .from(forms)
      .innerJoin(formVersions, eq(forms.lastPublishedVersionId, formVersions.id))
      .where(eq(forms.id, data.formId));

    if (!result?.version) {
      throw new Error("No published version to revert to");
    }

    const version = result.version;
    const snapshotSettings = (version.settings ?? {}) as Record<string, unknown>;

    // Compute hash over the full snapshot (matches publishFormVersion)
    const contentHash = computeContentHash({
      content: version.content,
      customization: version.customization ?? {},
      title: version.title,
      icon: version.icon,
      cover: version.cover,
      settings: snapshotSettings,
    });

    // Reset every versioned field (Groups 1-3) on the live draft back to the
    // snapshot. Group 4 (slug, customDomainId, branding) intentionally left
    // untouched — those are live and never versioned.
    const [updatedForm] = await db
      .update(forms)
      .set({
        content: version.content,
        title: version.title,
        customization: version.customization ?? {},
        icon: version.icon,
        cover: version.cover,
        // Group 2 settings — read back from snapshot jsonb
        progressBar: (snapshotSettings.progressBar as boolean) ?? false,
        autoJump: (snapshotSettings.autoJump as boolean) ?? false,
        saveAnswersForLater: (snapshotSettings.saveAnswersForLater as boolean) ?? true,
        redirectOnCompletion: (snapshotSettings.redirectOnCompletion as boolean) ?? false,
        redirectUrl: (snapshotSettings.redirectUrl as string | null) ?? null,
        redirectDelay: (snapshotSettings.redirectDelay as number) ?? 0,
        language: (snapshotSettings.language as string) ?? "English",
        passwordProtect: (snapshotSettings.passwordProtect as boolean) ?? false,
        password: (snapshotSettings.password as string | null) ?? null,
        closeForm: (snapshotSettings.closeForm as boolean) ?? false,
        closedFormMessage:
          (snapshotSettings.closedFormMessage as string | null) ?? "This form is now closed.",
        closeOnDate: (snapshotSettings.closeOnDate as boolean) ?? false,
        closeDate: (snapshotSettings.closeDate as string | null) ?? null,
        limitSubmissions: (snapshotSettings.limitSubmissions as boolean) ?? false,
        maxSubmissions: (snapshotSettings.maxSubmissions as number | null) ?? null,
        preventDuplicateSubmissions:
          (snapshotSettings.preventDuplicateSubmissions as boolean) ?? false,
        selfEmailNotifications: (snapshotSettings.selfEmailNotifications as boolean) ?? false,
        notificationEmail: (snapshotSettings.notificationEmail as string | null) ?? null,
        respondentEmailNotifications:
          (snapshotSettings.respondentEmailNotifications as boolean) ?? false,
        respondentEmailSubject: (snapshotSettings.respondentEmailSubject as string | null) ?? null,
        respondentEmailBody: (snapshotSettings.respondentEmailBody as string | null) ?? null,
        dataRetention: (snapshotSettings.dataRetention as boolean) ?? false,
        dataRetentionDays: (snapshotSettings.dataRetentionDays as number | null) ?? null,
        publishedContentHash: contentHash,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, data.formId))
      .returning();

    return {
      success: true,
      form: {
        ...updatedForm,
        content: updatedForm.content as object[],
        settings: (updatedForm.settings ?? {}) as Record<string, object>,
        customization: (updatedForm.customization ?? {}) as Record<string, string>,
        updatedAt: updatedForm.updatedAt.toISOString(),
        createdAt: updatedForm.createdAt.toISOString(),
      },
      version: {
        content: version.content as object[],
        settings: version.settings as Record<string, object>,
        title: version.title,
      },
    };
  });
