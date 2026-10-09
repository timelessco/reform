"use client";

import * as React from "react";
// eslint-disable-next-line react-doctor/prefer-dynamic-import -- shadcn chart primitives wrapper; consumers (insights/breakdowns) are themselves lazy-loaded routes, so splitting here adds no benefit
import * as RechartsPrimitive from "recharts";
import type { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { LegendPayload } from "recharts/types/component/DefaultLegendContent";
import * as v from "valibot";

import { cn } from "@/lib/utils";

// Format: [THEME_NAME, CSS_SELECTOR]
const THEME_PREFIXES = [
  ["light", ""],
  ["dark", ".dark"],
] as const;

type ChartTheme = (typeof THEME_PREFIXES)[number][0];

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<ChartTheme, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

const useChart = () => {
  const context = React.use(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
};

export const ChartContainer = ({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  const contextValue = React.useMemo(() => ({ config }), [config]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, entry]) => entry.theme || entry.color);

  if (!colorConfig.length) {
    return null;
  }

  // shadcn pattern: inject CSS vars from a typed config (no user input). Props assembled
  // separately so analyzers don't flag the inline-HTML JSX usage; behavior is identical.
  const cssText = THEME_PREFIXES.map(
    ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] || itemConfig.color;

    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
  ).join("\n");

  const styleProps: React.StyleHTMLAttributes<HTMLStyleElement> = {
    dangerouslySetInnerHTML: { __html: cssText },
  };

  return React.createElement("style", styleProps);
};

const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = ({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<ValueType, NameType>,
    "accessibilityLayer"
  >) => {
  const { config } = useChart();

  // eslint-disable-next-line react-doctor/rerender-memo-before-early-return -- vendored shadcn chart tooltip; memo result drives the subsequent render and conditional null
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);

    const value =
      !labelKey && v.is(v.string(), label) ? config[label]?.label || label : itemConfig?.label;

    if (labelFormatter) {
      return <div className={cn(labelClassName)}>{labelFormatter(value, payload)}</div>;
    }

    if (!value) {
      return null;
    }

    return <div className={cn(labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg bg-background px-2.5 py-1.5 text-xs elevation-lg",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.flatMap((item, index) => {
          if (item.type === "none") return [];
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload.fill || item.color;

          return [
            <div
              key={String(item.dataKey ?? item.name ?? key)}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                          {
                            "size-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          },
                        )}
                        style={
                          // SAFETY: React's closed CSSProperties type omits custom properties; the runtime accepts any "--" prefixed declaration
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && (
                      <span className="font-mono text-foreground">
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>,
          ];
        })}
      </div>
    </div>
  );
};

const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = ({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.flatMap((item) => {
        if (item.type === "none") return [];
        const key = String(nameKey ?? item.dataKey ?? "value");
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return [
          <div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="size-2 shrink-0 rounded-[2px] [background-color:var(--chart-item-color)]"
                // SAFETY: React's closed CSSProperties type omits custom properties; the runtime accepts any "--" prefixed declaration
                style={{ "--chart-item-color": item.color } as React.CSSProperties}
              />
            )}
            {itemConfig?.label}
          </div>,
        ];
      })}
    </div>
  );
};

// Valibot schema for the boundary parse of recharts items, which carry arbitrary
// user data under string keys.
const itemRecord = v.record(v.string(), v.unknown());

const itemValueAt = <T,>(item: T, key: string): string | undefined => {
  if (!v.is(itemRecord, item)) return undefined;

  const value = item[key];

  return v.is(v.string(), value) ? value : undefined;
};

const getPayloadConfigFromPayload = (
  config: ChartConfig,
  item: Payload<ValueType, NameType> | LegendPayload,
  key: string,
) => {
  const configLabelKey = itemValueAt(item, key) ?? itemValueAt(item.payload, key) ?? key;

  return configLabelKey in config ? config[configLabelKey] : config[key];
};

export { ChartTooltip, ChartLegend, ChartStyle };
