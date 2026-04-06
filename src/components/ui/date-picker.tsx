import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  className?: string;
}

export const DatePicker = ({ value, onChange, className }: DatePickerProps) => {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  });
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && onChange) {
      const formatted = format(selectedDate, "yyyy-MM-dd");
      onChange(formatted);
    } else if (onChange) {
      onChange(null);
    }
    setIsOpen(false);
  };

  const displayText = date ? format(date, "MMM d, yyyy") : "Pick a date";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            data-empty={!date}
            className={cn(
              "inline-flex items-center justify-start text-left font-normal w-full h-[30px] rounded-lg border-0 bg-card pl-2.5 pr-1.5 text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)]",
              !date && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={handleDateSelect} />
      </PopoverContent>
    </Popover>
  );
};
