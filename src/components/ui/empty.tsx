import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const Empty = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty"
    className={cn(
      "gap-4 rounded-xl border-dashed p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance",
      className,
    )}
    {...props}
  />
);

export const EmptyHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-header"
    className={cn("gap-2 flex max-w-sm flex-col items-center", className)}
    {...props}
  />
);

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const EmptyMedia = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) => (
  <div
    data-slot="empty-icon"
    data-variant={variant}
    className={cn(emptyMediaVariants({ variant, className }))}
    {...props}
  />
);

export const EmptyTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="empty-title" className={cn("text-sm", className)} {...props} />
);

export const EmptyDescription = ({ className, ...props }: React.ComponentProps<"p">) => (
  <div
    data-slot="empty-description"
    className={cn(
      "text-sm/relaxed text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
      className,
    )}
    {...props}
  />
);

export const EmptyContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-content"
    className={cn(
      "gap-2.5 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance",
      className,
    )}
    {...props}
  />
);
