import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
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
        nativeButton={false}
        render={
          <Button
            variant="outline"
            data-empty={!date}
            className={cn(
              "justify-start text-left font-normal w-[160px] text-sm",
              !date && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={handleDateSelect} />
      </PopoverContent>
    </Popover>
  );
};
