# Form File Upload: Real Storage & Submission Previews

**Date:** 2026-04-07
**Status:** Designed, ready for implementation

## Problem

Public form `FileUpload` fields don't actually upload anything. `render-step-preview-input.tsx:680-701` only saves the bare filename string into form state via `form.setFieldValue(element.name, fileName)`. The file bytes never leave the respondent's browser. As a result, the submissions table at `/workspace/.../submissions` shows uselessly bare filenames like `530581018546... .jpeg` with no way to view the file.

We need to (1) actually store uploaded files, (2) preserve enough metadata to render meaningful previews in the submissions table, and (3) protect the upload endpoint from abuse without adding new infrastructure cost.

## Decisions

| #   | Decision              | Choice                                                                                                           |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Storage backend       | **Vercel Blob** (already configured for avatars via `BETTER_FORM_READ_WRITE_TOKEN`)                              |
| 2   | Upload timing         | **Immediate on file select**, store URL in form state, submit sends the URL                                      |
| 3   | Abuse protection      | **Server-side validation against form definition + Postgres-backed per-IP rate limit**                           |
| 4   | Submission data shape | **Object** `{ url, name, size, type }` — single object, not array                                                |
| 5   | Preview rendering     | **Tiny image thumbnails for png/jpg**, MIME-typed icon for pdf/docx; click opens existing `media-preview-dialog` |

## Architecture

### 1. Storage layout (Vercel Blob)

```
submissions/{formId}/{submissionDraftId}/{uuid}.{ext}
```

- `formId` partitions per form, enables bulk delete on form deletion.
- `submissionDraftId` is a client-generated UUID that lives for the form page session. Allows orphan garbage collection: any blob under a draftId with no matching submission row after 24h is deletable.
- `{uuid}.{ext}` keeps URLs unguessable; Blob is public-read (same model as avatars).

### 2. Submission `data` shape

```ts
{
  upload_things: {
    url: string; // Blob public URL
    name: string; // original filename
    size: number; // bytes
    type: string; // MIME
  }
}
```

**Backwards compatibility:** existing rows with `upload_things: "filename.jpg"` (bare string) are tolerated by the renderer and shown in muted italic. No backfill, no migration.

### 3. Upload server function — `src/lib/fn/form-uploads.ts` (NEW)

```ts
export const uploadFormFile = createServerFn({ method: "POST" })
  // No authMiddleware — public forms accept anonymous uploads
  .inputValidator(
    z.object({
      formId: z.string(),
      draftId: z.string().uuid(),
      fieldName: z.string(),
      filename: z.string(),
      contentType: z.string(),
      base64: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await checkUploadRateLimit(getClientIp());
    const field = await assertFormFileField(data.formId, data.fieldName);
    const buffer = decodeBase64(data.base64);
    assertMimeAllowed(data.contentType, field);
    assertSizeAllowed(buffer.length, field);

    const ext = extFromMime(data.contentType);
    const blob = await put(
      `submissions/${data.formId}/${data.draftId}/${crypto.randomUUID()}.${ext}`,
      buffer,
      {
        access: "public",
        contentType: data.contentType,
        token: process.env.BETTER_FORM_READ_WRITE_TOKEN,
      },
    );

    return {
      url: blob.url,
      name: data.filename,
      size: buffer.length,
      type: data.contentType,
    };
  });
```

**Validation order is deliberate:**

1. Rate limit (cheapest, blocks cheapest abuse first)
2. Form lookup (prevents writes to non-existent / unpublished forms)
3. MIME allowlist from the actual field config
4. Size cap from the actual field config
5. Upload

### 4. Postgres rate limiter

New table:

```ts
// src/db/schema.ts
export const uploadRateLimits = pgTable("upload_rate_limits", {
  ip: text("ip").primaryKey(),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});
```

**`checkUploadRateLimit(ip)`** — single SQL upsert:

- If `windowStart` is older than `WINDOW_MINUTES` (10), reset to `now()`/count=1.
- Otherwise increment count.
- If `count > MAX_PER_WINDOW` (20), throw `Error("rate_limited")` (mapped to HTTP 429 client-side).

**Cleanup:** inline `DELETE WHERE window_start < now() - interval '1 hour'` runs on ~1% of requests (random). No cron required.

**Tunables (constants at top of file):**

- `WINDOW_MINUTES = 10`
- `MAX_PER_WINDOW = 20`
- `CLEANUP_PROBABILITY = 0.01`

### 5. Client field — `render-step-preview-input.tsx` `FileUploadPreview`

```ts
const draftIdRef = useRef(crypto.randomUUID());
const [uploadState, setUploadState] = useState<
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; value: { url: string; name: string; size: number; type: string } }
  | { status: "error"; message: string }
>({ status: "idle" });
```

**Flow on `onFilesChange`:**

1. Read picked file → `FileReader.readAsDataURL` → base64.
2. `setUploadState({ status: "uploading" })`.
3. Call `uploadFormFile({ data: { formId, draftId, fieldName, filename, contentType, base64 } })`.
4. On success: `setUploadState({ status: "done", value })` AND `form.setFieldValue(element.name, value)` — the form value is now an object.
5. On error: surface message in field error state, don't set form value.

**`formId` plumbing:** new prop threaded through `public-form-page.tsx` → `form-preview-from-plate.tsx` → `render-step-preview-input.tsx`. Single new prop, no context.

**Replace-on-replace cleanup:** when the user picks a new file or removes one, we do NOT delete the old blob inline. The 24h orphan sweep handles it.

**UI states:**

- Idle: existing dropzone, unchanged.
- Uploading: indeterminate spinner + "Uploading…" text. (Server functions don't expose per-byte progress.)
- Done: existing image/filename preview block, but `previewUrl` is now the Blob URL.
- Error: red border + message + retry by re-picking.

### 6. Submissions table cell — `submissions.tsx` `SubmissionCell` `FileUpload` branch

```tsx
case "FileUpload": {
  // Legacy: bare string filename from old submissions
  if (typeof value === "string") {
    return (
      <span className="text-[13px] text-muted-foreground italic truncate">
        {value}
      </span>
    );
  }
  if (!value || typeof value !== "object") {
    return <span className="text-[13px] text-muted-foreground">-</span>;
  }
  const file = value as { url: string; name: string; size: number; type: string };
  const isImage = file.type.startsWith("image/");

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openMediaPreview(file); }}
      title={`${file.name} • ${formatBytes(file.size)}`}
      className="flex items-center gap-2 max-w-[180px] group"
    >
      {isImage ? (
        <img
          src={file.url}
          alt=""
          loading="lazy"
          className="h-8 w-8 rounded object-cover border border-border/40 shrink-0"
        />
      ) : (
        <FileTypeIcon type={file.type} className="h-8 w-8 shrink-0" />
      )}
      <span className="text-[13px] truncate text-muted-foreground group-hover:text-foreground">
        {isImage ? "" : file.name}
      </span>
    </button>
  );
}
```

**`FileTypeIcon`** — small new component in the same file:

- `application/pdf` → red doc icon
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → blue doc icon
- fallback → generic paperclip

Uses lucide icons that already exist in the project.

**Click → preview dialog:** reuse `src/components/ui/media-preview-dialog.tsx`. Behavior by type:

- Image → `<img>` at natural size with viewport cap.
- PDF → `<iframe src={url}>`.
- DOCX/DOC → no in-browser viewer; show a "Download" button.

The dialog open/close state is lifted into `SubmissionsPage`. `openMediaPreview` is passed to `SubmissionCell` via TanStack Table `meta`, keeping `SubmissionCell` pure.

### 7. CSV export (`downloadCSV` in `submissions.tsx`)

Currently stringifies cell values raw, which would emit `[object Object]` for the new shape. Add a tiny helper:

```ts
const csvFormat = (value: unknown): string => {
  if (value && typeof value === "object" && "url" in value) {
    return (value as { url: string }).url;
  }
  return String(value ?? "");
};
```

Use it in the row-mapping closure. Leaves all existing string fields unchanged.

## Files affected

| File                                                                                    | Change                                                                                       |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`                                                                      | Add `uploadRateLimits` table                                                                 |
| `src/lib/fn/form-uploads.ts`                                                            | **NEW** — `uploadFormFile` server fn + rate limiter helpers                                  |
| `src/components/form-components/render-step-preview-input.tsx`                          | Rewrite `FileUploadPreview` to upload + store object                                         |
| `src/components/form-components/form-preview-from-plate.tsx`                            | Thread `formId` prop down                                                                    |
| `src/components/public/public-form-page.tsx`                                            | Pass `formId` to form preview                                                                |
| `src/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions.tsx` | New `FileUpload` cell renderer, `FileTypeIcon`, lifted media dialog state, CSV format helper |
| `src/components/ui/media-preview-dialog.tsx`                                            | Verify it accepts `{ url, name, type }` and branches by type; minor edit if needed           |
| Migration                                                                               | `bun run db:generate` after schema change                                                    |

## Out of scope (explicitly deferred)

- **Real PDF first-page thumbnails** (would need pdf.js, ~300KB+)
- **Server-generated thumbnails** (needs Vercel image transforms or a separate worker — violates "no new infra cost")
- **Multi-file uploads** per field (YAGNI; current field is single-file)
- **Inline orphan deletion on replace** (24h sweep is sufficient; orphan sweep itself is also follow-up work, not part of this design)
- **Rate limiter as shared middleware** (only used by uploads today; extract when a 2nd caller appears)
- **Migration of legacy bare-string submissions** (renderer tolerates them; they age out)

## Open follow-ups (NOT this design)

- A 24h orphan-cleanup job (cron or scheduled function) that walks `submissions/{formId}/{draftId}/...` and deletes blobs with no matching submission row.
- A shared rate limiter module if/when login or submission endpoints want one.
