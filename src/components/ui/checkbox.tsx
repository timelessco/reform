"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/ui/icons";

export const Checkbox = ({ className, ...props }: CheckboxPrimitive.Root.Props) => (
  <CheckboxPrimitive.Root
    data-slot="checkbox"
    className={cn(
      "shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring flex size-4 items-center justify-center rounded-[4px] border border-input bg-transparent transition-colors data-checked:bg-primary data-checked:text-primary-foreground data-checked:border-primary aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive group-has-disabled/field:opacity-50 peer relative after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      data-slot="checkbox-indicator"
      className="[&>svg]:size-3.5 grid place-content-center text-current transition-none"
    >
      <CheckIcon />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
