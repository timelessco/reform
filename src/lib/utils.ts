import { createIsomorphicFn } from "@tanstack/react-start";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse timestamp from DB/Electric as UTC. Postgres returns "YYYY-MM-DD HH:mm:ss" without timezone; treat as UTC. */
export function parseTimestampAsUTC(value: string | undefined): Date | null {
  if (!value) return null;
  if (value.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(value)) return new Date(value);
  return new Date(value.replace(" ", "T") + "Z");
}

/** Default icon sentinel used in form headers */
export const DEFAULT_ICON = "default-icon";
/** Fallback sprite icon name when no icon is set */
export const DEFAULT_ICON_NAME = "file-06";

/** Check if a string is a valid URL (absolute, relative path, blob, or data URI) */
export function isValidUrl(str: string): boolean {
  if (!str) return false;
  try {
    new URL(str);
    return true;
  } catch {
    return str.startsWith("/") || str.startsWith("http") || str.startsWith("blob:") || str.startsWith("data:");
  }
}

export const logger = createIsomorphicFn()
  .client((...args: any[]) => {
    if (!import.meta.env.PROD) {
      console.log("[Client Log] :", ...args);
    }
  })
  .server((...args: any[]) => {
    console.log("[Server Log] :", ...args);
  });



export function isNullable(value: unknown): value is null | undefined {
	// eslint-disable-next-line no-eq-null, eqeqeq
	return value == null;
}