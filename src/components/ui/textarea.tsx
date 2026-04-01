import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = ({ className, ...props }: React.ComponentProps<"textarea">) => (
  <textarea
    data-slot="textarea"
    className={cn(
      "relative flex field-sizing-content min-h-16 w-full rounded-[var(--radius-lg)] border-0 bg-card px-[10px] pr-[8px] py-2 text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] transition-colors placeholder:text-muted-foreground cursor-text caret-current outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:ring-1 aria-invalid:ring-destructive disabled:bg-input/50 dark:disabled:bg-input/80 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);
