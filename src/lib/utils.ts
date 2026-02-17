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

export const logger = createIsomorphicFn()
  .client((...args: any[]) => {
    if (!import.meta.env.PROD) {
      console.log("[Client Log] :", ...args);
    }
  })
  .server((...args: any[]) => {
    console.log("[Server Log] :", ...args);
  });
