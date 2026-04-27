import type { TimeRange } from "@/types/analytics";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
const DAYS_LAST_7 = 7;
const DAYS_LAST_30 = 30;
const DAYS_LAST_90 = 90;
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type ResolvedRange = {
  start: Date;
  end: Date;
  /** Inclusive list of UTC date keys (YYYY-MM-DD) covering the range. */
  days: string[];
};

const padTwo = (value: number): string => value.toString().padStart(2, "0");

export const toDateKey = (d: Date): string => {
  const year = d.getUTCFullYear();
  const month = padTwo(d.getUTCMonth() + 1);
  const day = padTwo(d.getUTCDate());
  return `${year}-${month}-${day}`;
};

const startOfUtcDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

const parseDateKey = (key: string): Date => {
  if (!DATE_KEY_REGEX.test(key)) {
    throw new Error(`Invalid date key '${key}': expected YYYY-MM-DD`);
  }
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

const buildDayKeysEndingAt = (endKey: string, count: number): string[] => {
  const endDay = parseDateKey(endKey);
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const day = new Date(endDay.getTime() - offset * MS_PER_DAY);
    keys.push(toDateKey(day));
  }
  return keys;
};

const buildDayKeysBetween = (startKey: string, endKey: string): string[] => {
  const startDay = parseDateKey(startKey);
  const endDay = parseDateKey(endKey);
  if (endDay.getTime() < startDay.getTime()) {
    throw new Error(`Invalid custom range: endDate '${endKey}' is before startDate '${startKey}'`);
  }
  const keys: string[] = [];
  for (let cursor = startDay.getTime(); cursor <= endDay.getTime(); cursor += MS_PER_DAY) {
    keys.push(toDateKey(new Date(cursor)));
  }
  return keys;
};

const resolveRollingHours = (hours: number, now: Date): ResolvedRange => {
  const end = now;
  const start = new Date(end.getTime() - hours * MS_PER_HOUR);
  const days = [toDateKey(end)];
  return { start, end, days };
};

const resolveRollingDays = (days: number, now: Date): ResolvedRange => {
  const end = now;
  const start = new Date(end.getTime() - days * MS_PER_DAY);
  const dayKeys = buildDayKeysEndingAt(toDateKey(end), days);
  return { start, end, days: dayKeys };
};

export const resolveTimeRange = (input: TimeRange, now: Date = new Date()): ResolvedRange => {
  switch (input.filter) {
    case "last_24_hours":
      return resolveRollingHours(HOURS_PER_DAY, now);
    case "last_7_days":
      return resolveRollingDays(DAYS_LAST_7, now);
    case "last_30_days":
      return resolveRollingDays(DAYS_LAST_30, now);
    case "last_90_days":
      return resolveRollingDays(DAYS_LAST_90, now);
    case "custom": {
      if (!(input.startDate && input.endDate)) {
        throw new Error("Custom time range requires both startDate and endDate (YYYY-MM-DD)");
      }
      const start = parseDateKey(input.startDate);
      // End-of-day UTC for the endDate (inclusive)
      const endDay = parseDateKey(input.endDate);
      const end = new Date(endDay.getTime() + MS_PER_DAY - 1);
      const days = buildDayKeysBetween(input.startDate, input.endDate);
      return { start, end, days };
    }
    default: {
      const exhaustive: never = input.filter;
      throw new Error(`Unknown time range filter: ${exhaustive as string}`);
    }
  }
};

export const splitTodayVsPast = (
  range: ResolvedRange,
  now: Date = new Date(),
): { todayStart: Date | null; pastDays: string[] } => {
  const todayKey = toDateKey(now);
  const includesToday = range.days.includes(todayKey);
  const pastDays = range.days.filter((key) => key !== todayKey);
  const todayStart = includesToday ? startOfUtcDay(now) : null;
  return { todayStart, pastDays };
};
