import { setResponseHeader } from "@tanstack/react-start/server";

const VERCEL_API = "https://api.vercel.com";

// Public forms are immutable per published version. We serve a year-long
// edge cache with stale-while-revalidate, and invalidate the cache tag
// when the form republishes, its branding changes, or it gets deleted.
// Clients (browsers) cache briefly so repeated in-session navigation is
// instant without hiding republish updates from authenticated viewers.
const PUBLIC_CACHE_CONTROL = [
  "public",
  "max-age=60",
  "s-maxage=31536000",
  "stale-while-revalidate=86400",
  "must-revalidate",
].join(", ");

const PRIVATE_CACHE_CONTROL = "private, no-store";

export const formCacheTag = (formId: string) => `form:${formId}`;

// Header object form for routes that build their own `Response`. Equivalent
// to `applyFormCacheHeaders` but doesn't depend on the request-context
// `setResponseHeader` side effect.
export const formCacheHeaders = (
  formId: string,
  { gated }: { gated: boolean },
): Record<string, string> => {
  if (gated) return { "Cache-Control": PRIVATE_CACHE_CONTROL };
  return {
    "Cache-Control": PUBLIC_CACHE_CONTROL,
    "Cache-Tag": formCacheTag(formId),
  };
};

// Attach cache headers to the current public-form response. `gated` covers
// password-protected forms, closed forms, over-limit forms, and error
// responses — all of which must bypass the shared cache to avoid leaking
// per-viewer state or stale gate decisions.
export const applyFormCacheHeaders = (formId: string, { gated }: { gated: boolean }) => {
  if (gated) {
    setResponseHeader("Cache-Control", PRIVATE_CACHE_CONTROL);
    return;
  }
  setResponseHeader("Cache-Control", PUBLIC_CACHE_CONTROL);
  // Vercel honours Cache-Tag on the Edge Network for tag-based purging;
  // non-Vercel CDNs ignore it harmlessly.
  setResponseHeader("Cache-Tag", formCacheTag(formId));
};

// Fire-and-forget purge by Cache-Tag via the Vercel API. No-op outside
// Vercel deployments (env vars absent).
export const purgeFormCache = (formId: string): Promise<void> => purgeFormCacheBatch([formId]);

// Vercel accepts a comma-separated tag list so any batch (bulk delete,
// daily cron) can ride a single API call.
export const purgeFormCacheBatch = async (formIds: string[]): Promise<void> => {
  if (formIds.length === 0) return;

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!(token && projectId)) return;

  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`${VERCEL_API}/v1/purge`);
  url.searchParams.set("projectIdOrName", projectId);
  url.searchParams.set("tag", formIds.map(formCacheTag).join(","));
  if (teamId) url.searchParams.set("teamId", teamId);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Don't throw — purge failures must not break publish/update flows.
      // The 60s browser max-age plus human behaviour (refresh on "didn't
      // see my change") is an acceptable fallback.
      const body = await res.text().catch(() => "");
      console.warn(`[cdn-cache] purge failed for ${formIds.length} tag(s): ${res.status} ${body}`);
    }
  } catch (err) {
    console.warn(`[cdn-cache] purge error for ${formIds.length} tag(s):`, err);
  }
};
