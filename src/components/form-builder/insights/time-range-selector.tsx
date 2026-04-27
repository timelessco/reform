import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeRangeFilter } from "@/types/analytics";

interface TimeRangeSelectorProps {
  value: TimeRangeFilter;
  startDate?: string;
  endDate?: string;
  onChange: (next: { filter: TimeRangeFilter; startDate?: string; endDate?: string }) => void;
}

const PRESET_OPTIONS: { value: TimeRangeFilter; label: string }[] = [
  { value: "last_24_hours", label: "Last 24 hours" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

export const TimeRangeSelector = ({
  value,
  startDate,
  endDate,
  onChange,
}: TimeRangeSelectorProps) => {
  const handlePresetChange = (next: TimeRangeFilter | null): void => {
    if (!next) {
      return;
    }
    if (next === "custom") {
      onChange({ filter: next, startDate, endDate });
      return;
    }
    onChange({ filter: next });
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ filter: "custom", startDate: event.target.value || undefined, endDate });
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ filter: "custom", startDate, endDate: event.target.value || undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={handlePresetChange}>
        <SelectTrigger className="min-w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value === "custom" ? (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span>From</span>
            <input
              type="date"
              value={startDate ?? ""}
              onChange={handleStartDateChange}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-foreground text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span>To</span>
            <input
              type="date"
              value={endDate ?? ""}
              onChange={handleEndDateChange}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-foreground text-xs"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
};
