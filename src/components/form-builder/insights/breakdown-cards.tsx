import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CountBreakdown, FormInsightsMetrics } from "@/types/analytics";

interface BreakdownCardsProps {
  metrics: FormInsightsMetrics;
}

interface BreakdownDatum {
  name: string;
  value: number;
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const numberFormatter = new Intl.NumberFormat("en-US");

const breakdownToArray = (breakdown: CountBreakdown): BreakdownDatum[] =>
  Object.entries(breakdown)
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

const TOP_N_SOURCES = 5;

const collapseToTopN = (entries: BreakdownDatum[], topN: number): BreakdownDatum[] => {
  if (entries.length <= topN) {
    return entries;
  }
  const top = entries.slice(0, topN);
  const rest = entries.slice(topN);
  const otherTotal = rest.reduce((sum, entry) => sum + entry.value, 0);
  if (otherTotal <= 0) {
    return top;
  }
  return [...top, { name: "Other", value: otherTotal }];
};

const buildPieConfig = (entries: BreakdownDatum[]): ChartConfig => {
  const config: ChartConfig = {};
  entries.forEach((entry, index) => {
    config[entry.name] = {
      label: entry.name,
      color: PALETTE[index % PALETTE.length],
    };
  });
  return config;
};

interface EmptyMessageProps {
  message?: string;
}

const EmptyMessage = ({ message = "No data yet" }: EmptyMessageProps) => (
  <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
    {message}
  </div>
);

interface PieBreakdownProps {
  data: BreakdownDatum[];
}

const PieBreakdown = ({ data }: PieBreakdownProps) => {
  if (data.length === 0) {
    return <EmptyMessage />;
  }
  const config = buildPieConfig(data);
  return (
    <ChartContainer config={config} className="aspect-square h-[200px] w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel={true} nameKey="name" />}
        />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
};

interface SourcesBarProps {
  data: BreakdownDatum[];
}

const SourcesBar = ({ data }: SourcesBarProps) => {
  if (data.length === 0) {
    return <EmptyMessage />;
  }
  const config: ChartConfig = {
    value: { label: "Visits", color: "var(--chart-1)" },
  };
  return (
    <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide={true} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={90}
          tickMargin={4}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={true} />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
};

interface CountriesTableProps {
  data: BreakdownDatum[];
}

const CountriesTable = ({ data }: CountriesTableProps) => {
  if (data.length === 0) {
    return <EmptyMessage />;
  }
  const top = data.slice(0, 10);
  return (
    <div className="max-h-[220px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">Visits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((entry) => (
            <TableRow key={entry.name}>
              <TableCell className="font-medium">{entry.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {numberFormatter.format(entry.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const BreakdownCards = ({ metrics }: BreakdownCardsProps) => {
  const devices = breakdownToArray(metrics.devices);
  const sources = collapseToTopN(breakdownToArray(metrics.sources), TOP_N_SOURCES);
  const countries = breakdownToArray(metrics.countries);
  const browsers = breakdownToArray(metrics.browsers);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <PieBreakdown data={devices} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <SourcesBar data={sources} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Countries</CardTitle>
        </CardHeader>
        <CardContent>
          <CountriesTable data={countries} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Browsers</CardTitle>
        </CardHeader>
        <CardContent>
          <PieBreakdown data={browsers} />
        </CardContent>
      </Card>
    </div>
  );
};
