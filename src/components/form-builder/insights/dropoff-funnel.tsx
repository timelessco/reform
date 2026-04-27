import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid-table";
import type { QuestionDropoffMetrics } from "@/types/analytics";

interface DropoffFunnelProps {
  dropoff: QuestionDropoffMetrics;
}

type DropoffRow = QuestionDropoffMetrics["questions"][number];

const numberFormatter = new Intl.NumberFormat("en-US");

const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value)}%`;
};

interface SummaryStatProps {
  label: string;
  value: string;
}

const SummaryStat = ({ label, value }: SummaryStatProps) => (
  <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {label}
    </span>
    <span className="font-semibold text-foreground text-lg tabular-nums">{value}</span>
  </div>
);

const toDropoffColumn = <TValue,>(column: ColumnDef<DropoffRow, TValue>): ColumnDef<DropoffRow> =>
  column as ColumnDef<DropoffRow>;

export const DropoffFunnel = ({ dropoff }: DropoffFunnelProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: "step", desc: false }]);

  const sortedQuestions = useMemo(
    () => [...dropoff.questions].sort((a, b) => a.questionIndex - b.questionIndex),
    [dropoff.questions],
  );

  const columns = useMemo<ColumnDef<DropoffRow>[]>(() => {
    const columnHelper = createColumnHelper<DropoffRow>();
    return [
      toDropoffColumn(
        columnHelper.accessor("questionIndex", {
          id: "step",
          header: ({ column }) => <DataGridColumnHeader column={column} title="Step" />,
          cell: (info) => (
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {info.getValue() + 1}
            </span>
          ),
          size: 80,
          minSize: 60,
        }),
      ),
      toDropoffColumn(
        columnHelper.accessor("questionLabel", {
          id: "label",
          header: ({ column }) => <DataGridColumnHeader column={column} title="Question" />,
          cell: (info) => {
            const row = info.row.original;
            const text = row.questionLabel ?? row.questionId;
            return (
              <span className="block truncate text-[13px]" title={text}>
                {text}
              </span>
            );
          },
          size: 280,
          minSize: 160,
        }),
      ),
      toDropoffColumn(
        columnHelper.accessor("viewCount", {
          id: "viewed",
          header: ({ column }) => <DataGridColumnHeader column={column} title="Viewed" />,
          cell: (info) => (
            <span className="text-[13px] tabular-nums">
              {numberFormatter.format(info.getValue())}
            </span>
          ),
          size: 110,
        }),
      ),
      toDropoffColumn(
        columnHelper.accessor("startCount", {
          id: "started",
          header: ({ column }) => <DataGridColumnHeader column={column} title="Started" />,
          cell: (info) => (
            <span className="text-[13px] tabular-nums">
              {numberFormatter.format(info.getValue())}
            </span>
          ),
          size: 110,
        }),
      ),
      toDropoffColumn(
        columnHelper.accessor("completeCount", {
          id: "completed",
          header: ({ column }) => <DataGridColumnHeader column={column} title="Completed" />,
          cell: (info) => (
            <span className="text-[13px] tabular-nums">
              {numberFormatter.format(info.getValue())}
            </span>
          ),
          size: 110,
        }),
      ),
      toDropoffColumn(
        columnHelper.accessor("dropoffRate", {
          id: "dropoff",
          header: ({ column }) => <DataGridColumnHeader column={column} title="Drop-off %" />,
          cell: (info) => (
            <span className="text-[13px] tabular-nums">{formatPercent(info.getValue())}</span>
          ),
          size: 130,
        }),
      ),
    ];
  }, []);

  const table = useReactTable({
    data: sortedQuestions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.questionId,
  });

  if (!dropoff || dropoff.questions.length === 0) {
    return (
      <div className="rounded-md border border-border/60 border-dashed bg-muted/20 p-6 text-center text-muted-foreground text-sm">
        No drop-off data yet — multi-step / field-by-field forms only.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataGrid
        table={table}
        recordCount={sortedQuestions.length}
        tableLayout={{
          dense: true,
          headerBackground: false,
          headerBorder: true,
          rowBorder: true,
          width: "fixed",
        }}
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat label="Total started" value={numberFormatter.format(dropoff.totalStarted)} />
        <SummaryStat
          label="Total completed"
          value={numberFormatter.format(dropoff.totalCompleted)}
        />
        <SummaryStat
          label="Overall completion"
          value={formatPercent(dropoff.overallCompletionRate)}
        />
      </div>
    </div>
  );
};
