import { createServerFn } from "@tanstack/react-start";
import { putBlob } from "@/integrations/blob";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import type { Value } from "platejs";
import { z } from "zod";
import { forms, formVersions, uploadRateLimits } from "@/db/schema";
import { db } from "@/db";
import {
  getEditableFields,
  transformPlateStateToFormElements,
} from "@/lib/editor/transform-plate-to-form";

/**
 * Public form file uploads — NO auth required.
 *
 * Hardened by:
 *   1. Postgres-backed per-IP rate limit
 *   2. Form must exist + be published + contain a FileUpload field with the given name
 *   3. MIME allowlist validation against the field's `accept` setting
 *   4. Max size validation
 */

// --- Tunables ---
const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 20;
const CLEANUP_PROBABILITY = 0.01;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_ACCEPT = "image/*,.pdf,.doc,.docx";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const getClientIp = (): string => {
  const headers = getRequestHeaders();
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp;
  }
  return "unknown";
};

// Inlined as a SQL literal because Postgres can't concatenate a parameterized
// integer with text inside an interval cast. Safe: it's a build-time constant.
const WINDOW_INTERVAL_SQL = sql.raw(`interval '${WINDOW_MINUTES} minutes'`);

const checkUploadRateLimit = async (ip: string): Promise<void> => {
  // Cleanup ~1% of requests
  if (Math.random() < CLEANUP_PROBABILITY) {
    await db.execute(
      sql`DELETE FROM upload_rate_limits WHERE window_start < now() - interval '1 hour'`,
    );
  }

  // Atomic upsert: insert with count=1, or on conflict either reset (window expired)
  // or increment.
  const result = await db
    .insert(uploadRateLimits)
    .values({ ip, count: 1 })
    .onConflictDoUpdate({
      target: uploadRateLimits.ip,
      set: {
        count: sql`CASE
          WHEN ${uploadRateLimits.windowStart} < now() - ${WINDOW_INTERVAL_SQL}
            THEN 1
          ELSE ${uploadRateLimits.count} + 1
        END`,
        windowStart: sql`CASE
          WHEN ${uploadRateLimits.windowStart} < now() - ${WINDOW_INTERVAL_SQL}
            THEN now()
          ELSE ${uploadRateLimits.windowStart}
        END`,
      },
    })
    .returning({ count: uploadRateLimits.count });

  const newCount = result[0]?.count ?? 0;
  if (newCount > MAX_PER_WINDOW) {
    throw new Error("rate_limited");
  }
};

const isMimeAllowed = (contentType: string, accept: string): boolean => {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  const mime = contentType.toLowerCase();
  for (const token of tokens) {
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1); // "image/"
      if (mime.startsWith(prefix)) return true;
    } else if (token.startsWith(".")) {
      // Extension token — match against EXT_BY_MIME
      const ext = EXT_BY_MIME[mime];
      if (ext && `.${ext}` === token) return true;
    } else if (token === mime) {
      return true;
    }
  }
  return false;
};

const assertFormFileField = async (
  formId: string,
  fieldName: string,
): Promise<{ accept: string }> => {
  const [form] = await db
    .select({
      status: forms.status,
      lastPublishedVersionId: forms.lastPublishedVersionId,
      draftContent: forms.content,
    })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.status, "published")));

  if (!form) {
    throw new Error("form_not_found");
  }

  let content: Value | null = null;
  if (form.lastPublishedVersionId) {
    const [version] = await db
      .select({ content: formVersions.content })
      .from(formVersions)
      .where(eq(formVersions.id, form.lastPublishedVersionId));
    content = (version?.content ?? null) as Value | null;
  } else {
    content = (form.draftContent ?? null) as Value | null;
  }

  if (!content) {
    throw new Error("form_has_no_content");
  }

  const elements = transformPlateStateToFormElements(content);
  const editable = getEditableFields(elements);
  const field = editable.find((f) => f.fieldType === "FileUpload" && f.name === fieldName);
  if (!field) {
    throw new Error("file_field_not_found");
  }
  const accept =
    "accept" in field && typeof field.accept === "string" && field.accept.length > 0
      ? field.accept
      : DEFAULT_ACCEPT;
  return { accept };
};

const decodeBase64 = (dataUrl: string): Buffer => {
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(base64, "base64");
};

export const uploadFormFile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      formId: z.uuid(),
      draftId: z.uuid(),
      fieldName: z.string().min(1),
      filename: z.string().min(1).max(255),
      contentType: z.string().min(1).max(127),
      base64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    // 1. Rate limit
    await checkUploadRateLimit(getClientIp());

    // 2. Form + field validation
    const { accept } = await assertFormFileField(data.formId, data.fieldName);

    // 3. MIME allowlist
    if (!isMimeAllowed(data.contentType, accept)) {
      throw new Error("mime_not_allowed");
    }

    // 4. Decode + size cap
    const buffer = decodeBase64(data.base64);
    if (buffer.length === 0) {
      throw new Error("empty_file");
    }
    if (buffer.length > MAX_FILE_BYTES) {
      throw new Error("file_too_large");
    }

    // 5. Upload to Vercel Blob
    const ext = EXT_BY_MIME[data.contentType.toLowerCase()] ?? "bin";
    const key = `submissions/${data.formId}/${data.draftId}/${crypto.randomUUID()}.${ext}`;
    const blob = await putBlob(key, buffer, data.contentType);

    return {
      url: blob.url,
      name: data.filename,
      size: buffer.length,
      type: data.contentType,
    };
  });

export type UploadedFormFile = {
  url: string;
  name: string;
  size: number;
  type: string;
};
