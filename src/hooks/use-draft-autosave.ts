import { useCallback } from "react";
import { createPublicSubmission } from "@/lib/server-fn/public-submissions";

const draftKey = (formId: string) => `bf-draft-${formId}`;

/**
 * Read the persisted draftId for a form, or generate and persist a fresh one.
 * Returns a fallback UUID (ephemeral, not written to storage) when
 * localStorage is unavailable (e.g. SSR, private mode, disabled cookies).
 */
export const getOrCreateDraftId = (formId: string): string => {
  if (typeof window === "undefined") return crypto.randomUUID();
  try {
    const existing = localStorage.getItem(draftKey(formId));
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(draftKey(formId), fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
};

export const readDraftId = (formId: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(draftKey(formId));
  } catch {
    return null;
  }
};

export const clearDraftId = (formId: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(formId));
  } catch {
    // localStorage unavailable
  }
};

interface SaveDraftInput {
  values: Record<string, unknown>;
  lastStepReached: number;
}

/**
 * Hook that returns a stable `saveDraft` function for a given form. Skips the
 * server call when every visible value is empty (prevents creating draft rows
 * for visitors who merely focused+blurred a field without typing).
 *
 * Debouncing is handled upstream by TanStack Form's `onBlurDebounceMs` — this
 * hook just fires the network request.
 */
export const useDraftAutoSave = (formId: string) => {
  const saveDraft = useCallback(
    async ({ values, lastStepReached }: SaveDraftInput) => {
      // Strip transient binary values (File/Blob) — FileUploadField sets the
      // field to a raw File for one tick before the upload listener replaces
      // it with the URL object. Persisting a File here would JSON-serialize to
      // `{}` and clobber any previously-saved URL for the same field.
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (typeof File !== "undefined" && v instanceof File) continue;
        if (typeof Blob !== "undefined" && v instanceof Blob) continue;
        sanitized[k] = v;
      }

      const hasAnyValue = Object.values(sanitized).some((v) => {
        if (v == null) return false;
        if (typeof v === "string") return v.length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      });
      if (!hasAnyValue) return;

      const draftId = getOrCreateDraftId(formId);
      try {
        await createPublicSubmission({
          data: {
            formId,
            data: sanitized,
            isCompleted: false,
            draftId,
            lastStepReached,
          },
        });
      } catch (err) {
        // Drafts are best-effort; never surface a draft save failure to the
        // user. The next blur (or final submit) will retry implicitly.
        console.error("[Reform] Draft autosave failed:", err);
      }
    },
    [formId],
  );

  return { saveDraft };
};
