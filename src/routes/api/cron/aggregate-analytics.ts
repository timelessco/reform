import { createFileRoute } from "@tanstack/react-router";
import { toDateKey } from "@/lib/analytics/time-range";
import { aggregateAnalyticsDaily } from "@/lib/server-fn/analytics";

const MS_PER_DAY = 86_400_000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isAuthorized = (request: Request): boolean => {
  // Vercel auto-injects this header on cron-triggered requests.
  if (request.headers.get("x-vercel-cron")) return true;
  // Manual trigger via shared secret (set CRON_SECRET in Vercel project env).
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  return false;
};

const resolveDateKey = (request: Request): string => {
  const url = new URL(request.url);
  const overrideDate = url.searchParams.get("date");
  if (overrideDate && DATE_KEY_RE.test(overrideDate)) {
    return overrideDate;
  }
  // Aggregate yesterday's UTC date — today is still being recorded.
  return toDateKey(new Date(Date.now() - MS_PER_DAY));
};

export const Route = createFileRoute("/api/cron/aggregate-analytics")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!isAuthorized(request)) {
          return new Response("forbidden", { status: 403 });
        }
        const dateKey = resolveDateKey(request);
        const result = await aggregateAnalyticsDaily({ data: { date: dateKey } });
        return Response.json(result);
      },
    },
  },
});
