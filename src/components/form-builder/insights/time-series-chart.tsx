import { EvilAreaChart } from "@/components/evilcharts/charts/area-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import type { FormInsightsMetrics } from "@/types/analytics";

interface TimeSeriesChartProps {
  dailyData: FormInsightsMetrics["dailyData"];
}

const chartConfig = {
  visits: {
    label: "Visits",
    colors: {
      light: ["var(--chart-1)"],
      dark: ["var(--chart-1)"],
    },
  },
  uniqueVisitors: {
    label: "Unique visitors",
    colors: {
      light: ["var(--chart-2)"],
      dark: ["var(--chart-2)"],
    },
  },
  submissions: {
    label: "Submissions",
    colors: {
      light: ["var(--chart-3)"],
      dark: ["var(--chart-3)"],
    },
  },
} satisfies ChartConfig;

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
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
    <EvilAreaChart
      className="h-[260px] w-full"
      chartConfig={chartConfig}
      data={dailyData}
      xDataKey="date"
      curveType="monotone"
      areaVariant="gradient"
      strokeVariant="solid"
      xAxisProps={{ tickFormatter: formatDateLabel }}
    />
  );
};
