import { z } from "zod";

/** Parse Postgres timestamp (no TZ) as UTC before converting to ISO. Avoids local-time misparse. */
const parseAsUTC = (val: string): string => {
  if (val.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(val)) return new Date(val).toISOString();
  return new Date(val.replace(" ", "T") + "Z").toISOString();
};

export const timestampField = z
  .string()
  .optional()
  .transform((val) => (val ? parseAsUTC(val) : new Date().toISOString()));

export const getElectricUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/electric`;
  }
  // Fallback for SSR (shouldn't be used since collections are client-only)
  return process.env.VITE_APP_URL
    ? `${process.env.VITE_APP_URL}/api/electric`
    : "http://localhost:3000/api/electric";
};

export type ServerTxResult = { txid: number };

let redirecting = false;

export const electricFetchClient: typeof fetch = async (url, init) => {
  const response = await fetch(url, { ...init, credentials: "include" });
  if (response.status === 401 && !redirecting) {
    redirecting = true;
    window.location.href = "/login";
  }
  return response;
};
