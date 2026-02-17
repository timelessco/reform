import { z } from "zod";

/** Parse Postgres timestamp (no TZ) as UTC before converting to ISO. Avoids local-time misparse. */
function parseAsUTC(val: string): string {
  if (val.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(val)) return new Date(val).toISOString();
  return new Date(val.replace(" ", "T") + "Z").toISOString();
}

// Helper to transform timestamp strings from Electric
// Postgres returns "YYYY-MM-DD HH:mm:ss" without timezone - treat as UTC
export const timestampField = z
  .string()
  .optional()
  .transform((val) => (val ? parseAsUTC(val) : new Date().toISOString()));

// ============================================================================
// Electric URL Helper
// ============================================================================

export const getElectricUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/electric`;
  }
  // Fallback for SSR (shouldn't be used since collections are client-only)
  return process.env.VITE_APP_URL
    ? `${process.env.VITE_APP_URL}/api/electric`
    : "http://localhost:3000/api/electric";
};

// Type for server function responses
export type ServerTxResult = { txid: number };

// ============================================================================
// Electric Fetch Client with Credentials
// ============================================================================

/**
 * Custom fetch client that includes credentials (cookies) with requests.
 * Required for Electric sync to work with cookie-based authentication.
 */
export const electricFetchClient: typeof fetch = (url, init) =>
  fetch(url, { ...init, credentials: "include" });
