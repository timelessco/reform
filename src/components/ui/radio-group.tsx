import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

export const RadioGroup = ({ className, ...props }: RadioGroupPrimitive.Props) => (
  <RadioGroupPrimitive
    data-slot="radio-group"
    className={cn("grid gap-2 w-full", className)}
    {...props}
  />
);

export const RadioGroupItem = ({ className, ...props }: RadioPrimitive.Root.Props) => (
  <RadioPrimitive.Root
    data-slot="radio-group-item"
    className={cn(
      "border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50 flex size-4 rounded-full focus-visible:ring-3 aria-invalid:ring-3 group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <RadioPrimitive.Indicator
      data-slot="radio-group-indicator"
      className="flex size-4 items-center justify-center"
    >
      <span className="bg-primary-foreground absolute top-1/2 start-1/2 size-2 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 rounded-full" />
    </RadioPrimitive.Indicator>
  </RadioPrimitive.Root>
);
