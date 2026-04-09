/**
 * Shared CORS headers for public embed-support endpoints.
 * These routes expose non-sensitive data about published forms to arbitrary
 * third-party sites so the embed script (public/embed/popup.js) can render a
 * bubble + popup on the embedder's domain.
 *
 * We intentionally do NOT send Access-Control-Allow-Credentials — these
 * endpoints must never be reached with cookies attached.
 */
export const publicCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/** Published form UUID shape — reject anything else up front. */
export const FORM_ID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
