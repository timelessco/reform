import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { forms, formVersions, user } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { authForm, getTxId } from "./helpers";

// Maximum number of versions to keep per form (TODO: make plan-based)
const MAX_VERSIONS_PER_FORM = 20;

/**
 * Compute a hash of the content for fast change detection
 */
function computeContentHash(content: unknown): string {
  const str = JSON.stringify(content);
  return crypto.createHash("md5").update(str).digest("hex");
}

const serializeVersion = (version: typeof formVersions.$inferSelect) => ({
  ...version,
  publishedAt: version.publishedAt.toISOString(),
  createdAt: version.createdAt.toISOString(),
  content: version.content as object[],
  settings: version.settings as Record<string, object>,
});

/**
 * Publish the current form draft as a new version
 */
export const publishFormVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: currentUser } = await authForm(data.formId);

    // Get current form draft
    const [form] = await db.select().from(forms).where(eq(forms.id, data.formId));

    if (!form) {
      throw new Error("Form not found");
    }

    // Get next version number
    const [lastVersion] = await db
      .select({ version: formVersions.version })
      .from(formVersions)
      .where(eq(formVersions.formId, data.formId))
      .orderBy(desc(formVersions.version))
      .limit(1);

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Compute content hash
    const contentHash = computeContentHash(form.content);

    // Create version snapshot
    const versionId = crypto.randomUUID();
    const now = new Date();

    const [newVersion] = await db
      .insert(formVersions)
      .values({
        id: versionId,
        formId: data.formId,
        version: nextVersion,
        content: form.content,
        settings: form.settings,
        title: form.title,
        publishedByUserId: currentUser.id,
        publishedAt: now,
        createdAt: now,
      })
      .returning();

    // Update form with new version reference and hash
    await db
      .update(forms)
      .set({
        status: "published",
        lastPublishedVersionId: versionId,
        publishedContentHash: contentHash,
        updatedAt: now,
      })
      .where(eq(forms.id, data.formId));

    // Delete old versions beyond limit (keep last MAX_VERSIONS_PER_FORM)
    const allVersions = await db
      .select({ id: formVersions.id })
      .from(formVersions)
      .where(eq(formVersions.formId, data.formId))
      .orderBy(desc(formVersions.version));

    if (allVersions.length > MAX_VERSIONS_PER_FORM) {
      const versionsToDelete = allVersions.slice(MAX_VERSIONS_PER_FORM).map((v) => v.id);

      await db.delete(formVersions).where(inArray(formVersions.id, versionsToDelete));
    }

    const txid = await getTxId();

    return {
      version: serializeVersion(newVersion),
      versionNumber: nextVersion,
      txid,
    };
  });

/**
 * Get list of published versions for a form
 */
export const getFormVersions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await authForm(data.formId);

    const versions = await db
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
      .orderBy(desc(formVersions.version));

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
  .handler(async ({ data }) => {
    // Get the version
    const [version] = await db
      .select()
      .from(formVersions)
      .where(eq(formVersions.id, data.versionId));

    if (!version) {
      throw new Error("Version not found");
    }

    // Verify user has access to the form
    await authForm(version.formId);

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
  .handler(async ({ data }) => {
    await authForm(data.formId);

    // Get the version
    const [version] = await db
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.id, data.versionId), eq(formVersions.formId, data.formId)));

    if (!version) {
      throw new Error("Version not found");
    }

    // Update form draft with version content
    // Note: We don't update publishedContentHash so the form shows "has changes"
    await db
      .update(forms)
      .set({
        content: version.content,
        settings: version.settings,
        title: version.title,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, data.formId));

    const txid = await getTxId();

    return { success: true, txid };
  });

/**
 * Discard all changes and revert to last published version
 */
export const discardFormChanges = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await authForm(data.formId);

    // Get the form to find last published version
    const [form] = await db
      .select({ lastPublishedVersionId: forms.lastPublishedVersionId })
      .from(forms)
      .where(eq(forms.id, data.formId));

    if (!form?.lastPublishedVersionId) {
      throw new Error("No published version to revert to");
    }

    // Get the last published version
    const [version] = await db
      .select()
      .from(formVersions)
      .where(eq(formVersions.id, form.lastPublishedVersionId));

    if (!version) {
      throw new Error("Published version not found");
    }

    // Compute hash of the version content
    const contentHash = computeContentHash(version.content);

    // Update form draft with version content AND hash (so no "changes" indicator)
    await db
      .update(forms)
      .set({
        content: version.content,
        settings: version.settings,
        title: version.title,
        publishedContentHash: contentHash,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, data.formId));

    const txid = await getTxId();

    return { success: true, txid };
  });

/**
 * Get the latest published version content for a form (used by public form)
 */
export const getLatestPublishedVersion = createServerFn({ method: "GET" })
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Get form with its current published version
    const [form] = await db
      .select({
        id: forms.id,
        status: forms.status,
        icon: forms.icon,
        cover: forms.cover,
        lastPublishedVersionId: forms.lastPublishedVersionId,
      })
      .from(forms)
      .where(and(eq(forms.id, data.formId), eq(forms.status, "published")));

    if (!form) {
      return { form: null, error: "not_found" as const };
    }

    if (!form.lastPublishedVersionId) {
      return { form: null, error: "not_published" as const };
    }

    // Get the published version content
    const [version] = await db
      .select()
      .from(formVersions)
      .where(eq(formVersions.id, form.lastPublishedVersionId));

    if (!version) {
      return { form: null, error: "version_not_found" as const };
    }

    return {
      form: {
        id: form.id,
        title: version.title,
        content: version.content as object[],
        settings: version.settings as Record<string, object>,
        icon: form.icon,
        cover: form.cover,
        status: form.status,
      },
      error: null,
    };
  });

/**
 * Compute content hash - exported for use in hooks
 */
const computeFormContentHash = createServerFn({ method: "POST" })
  .inputValidator(z.object({ content: z.array(z.any()) }))
  .handler(async ({ data }) => {
    return { hash: computeContentHash(data.content) };
  });
