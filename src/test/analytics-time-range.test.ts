import { describe, expect, it } from "vitest";
import { resolveTimeRange, splitTodayVsPast, toDateKey } from "@/lib/analytics/time-range";

const FIXED_NOW = new Date("2026-04-27T12:00:00Z");

describe("toDateKey", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    expect(toDateKey(new Date("2026-04-27T12:00:00Z"))).toBe("2026-04-27");
  });

  it("uses UTC date even for instants near midnight in non-UTC timezones", () => {
    // 2026-04-27T23:30:00-05:00 == 2026-04-28T04:30:00Z
    expect(toDateKey(new Date("2026-04-27T23:30:00-05:00"))).toBe("2026-04-28");
    // 2026-04-28T00:30:00+05:00 == 2026-04-27T19:30:00Z
    expect(toDateKey(new Date("2026-04-28T00:30:00+05:00"))).toBe("2026-04-27");
  });

  it("zero-pads month and day", () => {
    expect(toDateKey(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });
});

describe("resolveTimeRange", () => {
  it("resolves last_24_hours: 1 day, end equals now", () => {
    const result = resolveTimeRange({ filter: "last_24_hours" }, FIXED_NOW);
    expect(result.end.toISOString()).toBe(FIXED_NOW.toISOString());
    expect(result.start.toISOString()).toBe(new Date("2026-04-26T12:00:00Z").toISOString());
    expect(result.days).toHaveLength(1);
    expect(result.days[0]).toBe("2026-04-27");
  });

  it("resolves last_7_days: 7 unique day keys, end equals now", () => {
    const result = resolveTimeRange({ filter: "last_7_days" }, FIXED_NOW);
    expect(result.end.toISOString()).toBe(FIXED_NOW.toISOString());
    expect(result.days).toHaveLength(7);
    expect(new Set(result.days).size).toBe(7);
    expect(result.days[result.days.length - 1]).toBe("2026-04-27");
    expect(result.days[0]).toBe("2026-04-21");
  });

  it("resolves last_30_days: 30 unique day keys", () => {
    const result = resolveTimeRange({ filter: "last_30_days" }, FIXED_NOW);
    expect(result.days).toHaveLength(30);
    expect(new Set(result.days).size).toBe(30);
    expect(result.days[result.days.length - 1]).toBe("2026-04-27");
  });

  it("resolves last_90_days: 90 unique day keys", () => {
    const result = resolveTimeRange({ filter: "last_90_days" }, FIXED_NOW);
    expect(result.days).toHaveLength(90);
    expect(new Set(result.days).size).toBe(90);
    expect(result.days[result.days.length - 1]).toBe("2026-04-27");
  });

  it("resolves custom range with valid startDate/endDate (inclusive)", () => {
    const result = resolveTimeRange(
      {
        filter: "custom",
        startDate: "2026-04-01",
        endDate: "2026-04-05",
      },
      FIXED_NOW,
    );
    expect(result.days).toStrictEqual([
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-04",
      "2026-04-05",
    ]);
    expect(toDateKey(result.start)).toBe("2026-04-01");
    expect(toDateKey(result.end)).toBe("2026-04-05");
  });

  it("custom range with same start and end produces single day", () => {
    const result = resolveTimeRange(
      {
        filter: "custom",
        startDate: "2026-04-10",
        endDate: "2026-04-10",
      },
      FIXED_NOW,
    );
    expect(result.days).toStrictEqual(["2026-04-10"]);
  });

  it("throws when custom is missing startDate", () => {
    expect(() => resolveTimeRange({ filter: "custom", endDate: "2026-04-05" }, FIXED_NOW)).toThrow(
      /startDate/i,
    );
  });

  it("throws when custom is missing endDate", () => {
    expect(() =>
      resolveTimeRange({ filter: "custom", startDate: "2026-04-01" }, FIXED_NOW),
    ).toThrow(/endDate/i);
  });

  it("throws when custom is missing both dates", () => {
    expect(() => resolveTimeRange({ filter: "custom" }, FIXED_NOW)).toThrow(
      /startDate and endDate/i,
    );
  });
});

describe("splitTodayVsPast", () => {
  it("excludes today's key from pastDays", () => {
    const range = resolveTimeRange({ filter: "last_7_days" }, FIXED_NOW);
    const { todayStart, pastDays } = splitTodayVsPast(range, FIXED_NOW);
    expect(pastDays).toHaveLength(6);
    expect(pastDays).not.toContain("2026-04-27");
    expect(todayStart).not.toBeNull();
    expect(todayStart?.toISOString()).toBe("2026-04-27T00:00:00.000Z");
  });

  it("returns null todayStart when range ends before today", () => {
    const range = resolveTimeRange(
      {
        filter: "custom",
        startDate: "2026-04-01",
        endDate: "2026-04-05",
      },
      FIXED_NOW,
    );
    const { todayStart, pastDays } = splitTodayVsPast(range, FIXED_NOW);
    expect(todayStart).toBeNull();
    expect(pastDays).toStrictEqual([
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-04",
      "2026-04-05",
    ]);
  });

  it("returns todayStart when custom range includes today", () => {
    const range = resolveTimeRange(
      {
        filter: "custom",
        startDate: "2026-04-25",
        endDate: "2026-04-27",
      },
      FIXED_NOW,
    );
    const { todayStart, pastDays } = splitTodayVsPast(range, FIXED_NOW);
    expect(todayStart?.toISOString()).toBe("2026-04-27T00:00:00.000Z");
    expect(pastDays).toStrictEqual(["2026-04-25", "2026-04-26"]);
  });

  it("last_24_hours: pastDays empty, todayStart set", () => {
    const range = resolveTimeRange({ filter: "last_24_hours" }, FIXED_NOW);
    const { todayStart, pastDays } = splitTodayVsPast(range, FIXED_NOW);
    expect(pastDays).toStrictEqual([]);
    expect(todayStart?.toISOString()).toBe("2026-04-27T00:00:00.000Z");
  });
});
