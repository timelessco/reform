import { cn } from "@/lib/utils";

export const Kbd = ({ className, ...props }: React.ComponentProps<"kbd">) => (
  <kbd
    data-slot="kbd"
    className={cn(
      "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex items-center justify-center select-none",
      className,
    )}
    {...props}
  />
);

export const KbdGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <kbd
    data-slot="kbd-group"
    className={cn("gap-1 inline-flex items-center", className)}
    {...props}
  />
);
