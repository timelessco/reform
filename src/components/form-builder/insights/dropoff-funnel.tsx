import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QuestionDropoffMetrics } from "@/types/analytics";

interface DropoffFunnelProps {
  dropoff: QuestionDropoffMetrics;
}

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

export const DropoffFunnel = ({ dropoff }: DropoffFunnelProps) => {
  if (!dropoff || dropoff.questions.length === 0) {
    return (
      <div className="rounded-md border border-border/60 border-dashed bg-muted/20 p-6 text-center text-muted-foreground text-sm">
        No drop-off data yet — multi-step / field-by-field forms only.
      </div>
    );
  }

  const sortedQuestions = [...dropoff.questions].sort((a, b) => a.questionIndex - b.questionIndex);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Step</TableHead>
              <TableHead className="text-right">Viewed</TableHead>
              <TableHead className="text-right">Started</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Drop-off %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedQuestions.map((question) => (
              <TableRow key={question.questionId}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {question.questionIndex + 1}
                </TableCell>
                <TableCell className="max-w-[280px] truncate">
                  {question.questionLabel ?? question.questionId}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numberFormatter.format(question.viewCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numberFormatter.format(question.startCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numberFormatter.format(question.completeCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(question.dropoffRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
