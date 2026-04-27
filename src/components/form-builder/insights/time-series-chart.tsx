import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type { FormInsightsMetrics } from "@/types/analytics";

interface TimeSeriesChartProps {
  dailyData: FormInsightsMetrics["dailyData"];
}

const chartConfig: ChartConfig = {
  visits: {
    label: "Visits",
    color: "var(--chart-1)",
  },
  uniqueVisitors: {
    label: "Unique visitors",
    color: "var(--chart-2)",
  },
  submissions: {
    label: "Submissions",
    color: "var(--chart-3)",
  },
};

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const formatDateLabel = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return dateLabelFormatter.format(parsed);
};

export const TimeSeriesChart = ({ dailyData }: TimeSeriesChartProps) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
        No data for this range
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={dailyData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillUniqueVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-uniqueVisitors)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-uniqueVisitors)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillSubmissions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-submissions)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-submissions)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatDateLabel}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} width={32} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(value) => formatDateLabel(String(value))}
            />
          }
        />
        <Area
          dataKey="visits"
          type="monotone"
          fill="url(#fillVisits)"
          stroke="var(--color-visits)"
          strokeWidth={2}
        />
        <Area
          dataKey="uniqueVisitors"
          type="monotone"
          fill="url(#fillUniqueVisitors)"
          stroke="var(--color-uniqueVisitors)"
          strokeWidth={2}
        />
        <Area
          dataKey="submissions"
          type="monotone"
          fill="url(#fillSubmissions)"
          stroke="var(--color-submissions)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
};
