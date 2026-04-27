import type { formAnalyticsDaily, formVisits } from "@/db/schema";
import type { CountBreakdown, FormInsightsMetrics } from "@/types/analytics";

type DailyRow = typeof formAnalyticsDaily.$inferSelect;
type RawVisitRow = typeof formVisits.$inferSelect;

interface MergeArgs {
  dailyRows: DailyRow[];
  todayRawRows: RawVisitRow[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: string[]; // YYYY-MM-DD list, all dates in range
  todayKey: string | null; // YYYY-MM-DD or null if range excludes today
}

const KNOWN_BROWSERS = new Set(["Chrome", "Firefox", "Safari", "Edge"]);
const KNOWN_OS = new Set(["Windows", "macOS", "iOS", "Android", "Linux"]);

const addBreakdowns = (a: CountBreakdown, b: CountBreakdown): CountBreakdown => {
  const result: CountBreakdown = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
};

const incrementBreakdown = (target: CountBreakdown, key: string | null | undefined): void => {
  if (!key) {
    return;
  }
  target[key] = (target[key] ?? 0) + 1;
};

const bucketBrowser = (name: string | null | undefined): string => {
  if (name && KNOWN_BROWSERS.has(name)) {
    return name;
  }
  return "Other";
};

const bucketOs = (name: string | null | undefined): string => {
  if (name && KNOWN_OS.has(name)) {
    return name;
  }
  return "Other";
};

interface DailyAggregate {
  totalVisits: number;
  uniqueVisitors: number;
  totalSubmissions: number;
  uniqueRespondents: number;
  durationSumWeighted: number;
  durationVisitsWeight: number;
  sources: CountBreakdown;
  devices: CountBreakdown;
  countries: CountBreakdown;
  cities: CountBreakdown;
  browsers: CountBreakdown;
  operatingSystems: CountBreakdown;
}

const emptyAggregate = (): DailyAggregate => ({
  totalVisits: 0,
  uniqueVisitors: 0,
  totalSubmissions: 0,
  uniqueRespondents: 0,
  durationSumWeighted: 0,
  durationVisitsWeight: 0,
  sources: {},
  devices: {},
  countries: {},
  cities: {},
  browsers: {},
  operatingSystems: {},
});

const aggregateDailyRows = (rows: DailyRow[]): DailyAggregate => {
  const agg = emptyAggregate();
  for (const row of rows) {
    agg.totalVisits += row.totalVisits;
    // NOTE: summing uniqueVisitors across daily rows over-counts visitors active
    // on multiple days (counted once per day). Acceptable approximation for v1.
    agg.uniqueVisitors += row.uniqueVisitors;
    agg.totalSubmissions += row.totalSubmissions;
    agg.uniqueRespondents += row.uniqueSubmitters;

    if (row.avgDurationMs !== null && row.totalVisits > 0) {
      agg.durationSumWeighted += row.avgDurationMs * row.totalVisits;
      agg.durationVisitsWeight += row.totalVisits;
    }

    // Devices
    if (row.deviceDesktop) {
      agg.devices.desktop = (agg.devices.desktop ?? 0) + row.deviceDesktop;
    }
    if (row.deviceMobile) {
      agg.devices.mobile = (agg.devices.mobile ?? 0) + row.deviceMobile;
    }
    if (row.deviceTablet) {
      agg.devices.tablet = (agg.devices.tablet ?? 0) + row.deviceTablet;
    }

    // Browsers
    if (row.browserChrome) {
      agg.browsers.Chrome = (agg.browsers.Chrome ?? 0) + row.browserChrome;
    }
    if (row.browserFirefox) {
      agg.browsers.Firefox = (agg.browsers.Firefox ?? 0) + row.browserFirefox;
    }
    if (row.browserSafari) {
      agg.browsers.Safari = (agg.browsers.Safari ?? 0) + row.browserSafari;
    }
    if (row.browserEdge) {
      agg.browsers.Edge = (agg.browsers.Edge ?? 0) + row.browserEdge;
    }
    if (row.browserOther) {
      agg.browsers.Other = (agg.browsers.Other ?? 0) + row.browserOther;
    }

    // Operating systems
    if (row.osWindows) {
      agg.operatingSystems.Windows = (agg.operatingSystems.Windows ?? 0) + row.osWindows;
    }
    if (row.osMacos) {
      agg.operatingSystems.macOS = (agg.operatingSystems.macOS ?? 0) + row.osMacos;
    }
    if (row.osIos) {
      agg.operatingSystems.iOS = (agg.operatingSystems.iOS ?? 0) + row.osIos;
    }
    if (row.osAndroid) {
      agg.operatingSystems.Android = (agg.operatingSystems.Android ?? 0) + row.osAndroid;
    }
    if (row.osLinux) {
      agg.operatingSystems.Linux = (agg.operatingSystems.Linux ?? 0) + row.osLinux;
    }
    if (row.osOther) {
      agg.operatingSystems.Other = (agg.operatingSystems.Other ?? 0) + row.osOther;
    }

    // JSONB breakdowns
    agg.countries = addBreakdowns(agg.countries, (row.countryBreakdown ?? {}) as CountBreakdown);
    agg.cities = addBreakdowns(agg.cities, (row.cityBreakdown ?? {}) as CountBreakdown);
    agg.sources = addBreakdowns(agg.sources, (row.sourceBreakdown ?? {}) as CountBreakdown);
  }
  return agg;
};

interface RawAggregate extends DailyAggregate {
  durationSum: number;
  durationCount: number;
}

const aggregateRawRows = (rows: RawVisitRow[]): RawAggregate => {
  const visitorHashes = new Set<string>();
  const respondentHashes = new Set<string>();
  let totalVisits = 0;
  let totalSubmissions = 0;
  let durationSum = 0;
  let durationCount = 0;
  const sources: CountBreakdown = {};
  const devices: CountBreakdown = {};
  const countries: CountBreakdown = {};
  const cities: CountBreakdown = {};
  const browsers: CountBreakdown = {};
  const operatingSystems: CountBreakdown = {};

  for (const row of rows) {
    totalVisits += 1;
    visitorHashes.add(row.visitorHash);
    if (row.didSubmit) {
      totalSubmissions += 1;
      respondentHashes.add(row.visitorHash);
    }
    if (row.durationMs !== null && row.durationMs !== undefined) {
      durationSum += row.durationMs;
      durationCount += 1;
    }

    incrementBreakdown(devices, row.deviceType);
    incrementBreakdown(countries, row.country);
    incrementBreakdown(cities, row.city);
    incrementBreakdown(sources, row.utmSource);
    browsers[bucketBrowser(row.browser)] = (browsers[bucketBrowser(row.browser)] ?? 0) + 1;
    operatingSystems[bucketOs(row.os)] = (operatingSystems[bucketOs(row.os)] ?? 0) + 1;
  }

  return {
    totalVisits,
    uniqueVisitors: visitorHashes.size,
    totalSubmissions,
    uniqueRespondents: respondentHashes.size,
    durationSumWeighted: durationSum,
    durationVisitsWeight: durationCount,
    durationSum,
    durationCount,
    sources,
    devices,
    countries,
    cities,
    browsers,
    operatingSystems,
  };
};

const buildDailyEntry = (
  date: string,
  dailyByDate: Map<string, DailyRow>,
  todayKey: string | null,
  rawRows: RawVisitRow[],
): { date: string; visits: number; uniqueVisitors: number; submissions: number } => {
  if (todayKey && date === todayKey) {
    const visitorHashes = new Set<string>();
    let visits = 0;
    let submissions = 0;
    for (const row of rawRows) {
      visits += 1;
      visitorHashes.add(row.visitorHash);
      if (row.didSubmit) {
        submissions += 1;
      }
    }
    return { date, visits, uniqueVisitors: visitorHashes.size, submissions };
  }
  const row = dailyByDate.get(date);
  if (!row) {
    return { date, visits: 0, uniqueVisitors: 0, submissions: 0 };
  }
  return {
    date,
    visits: row.totalVisits,
    uniqueVisitors: row.uniqueVisitors,
    submissions: row.totalSubmissions,
  };
};

export const mergeInsightsMetrics = (args: MergeArgs): FormInsightsMetrics => {
  const { dailyRows, todayRawRows, startDate, endDate, days, todayKey } = args;

  const dailyAgg = aggregateDailyRows(dailyRows);
  const rawAgg = aggregateRawRows(todayRawRows);

  const totalVisits = dailyAgg.totalVisits + rawAgg.totalVisits;
  const uniqueVisitors = dailyAgg.uniqueVisitors + rawAgg.uniqueVisitors;
  const totalSubmissions = dailyAgg.totalSubmissions + rawAgg.totalSubmissions;
  const uniqueRespondents = dailyAgg.uniqueRespondents + rawAgg.uniqueRespondents;

  // Weighted avg across daily and raw pools
  const totalDurationSum = dailyAgg.durationSumWeighted + rawAgg.durationSum;
  const totalDurationWeight = dailyAgg.durationVisitsWeight + rawAgg.durationCount;
  const avgVisitDurationMs =
    totalDurationWeight > 0 ? Math.round(totalDurationSum / totalDurationWeight) : 0;

  const sources = addBreakdowns(dailyAgg.sources, rawAgg.sources);
  const devices = addBreakdowns(dailyAgg.devices, rawAgg.devices);
  const countries = addBreakdowns(dailyAgg.countries, rawAgg.countries);
  const cities = addBreakdowns(dailyAgg.cities, rawAgg.cities);
  const browsers = addBreakdowns(dailyAgg.browsers, rawAgg.browsers);
  const operatingSystems = addBreakdowns(dailyAgg.operatingSystems, rawAgg.operatingSystems);

  const dailyByDate = new Map<string, DailyRow>();
  for (const row of dailyRows) {
    dailyByDate.set(row.date, row);
  }
  const dailyData = days.map((date) => buildDailyEntry(date, dailyByDate, todayKey, todayRawRows));

  return {
    startDate,
    endDate,
    totalVisits,
    uniqueVisitors,
    totalSubmissions,
    uniqueRespondents,
    avgVisitDurationMs,
    sources,
    devices,
    countries,
    cities,
    browsers,
    operatingSystems,
    dailyData,
  };
};
