/** Known app hostnames that should never be treated as custom domains */
const APP_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Patterns for app-owned hostnames (e.g. *.vercel.app deployments) */
const APP_HOST_PATTERNS = [/\.vercel\.app$/];

/**
 * Extract the user-facing host from a Headers object, preferring
 * `x-forwarded-host` (set by Vercel/proxies) over the raw `host` header.
 * Accepts the native Headers instance returned by TanStack Start's
 * getRequestHeaders() — NOT a plain object.
 */
export const getRequestHost = (headers: Headers): string =>
  headers.get("x-forwarded-host") ?? headers.get("host") ?? headers.get(":authority") ?? "";

/**
 * Returns true when the Host header belongs to the app itself
 * (localhost, Vercel previews, etc.) — NOT a custom domain.
 */
export const isAppHost = (host: string): boolean => {
  const hostname = host.split(":")[0]; // strip port
  if (APP_HOSTS.has(hostname)) return true;
  if (process.env.APP_DOMAIN && hostname === process.env.APP_DOMAIN) return true;
  return APP_HOST_PATTERNS.some((re) => re.test(hostname));
};

export interface DomainMeta {
  siteTitle: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

export interface ResolvedDomain {
  id: string;
  organizationId: string;
  domain: string;
  siteTitle: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}
