import * as React from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "grid gap-0.5 rounded-lg border px-2.5 py-2 text-start text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pe-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 w-full relative group/alert",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const Alert = ({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) => (
  <div
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
);

export const AlertTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-title"
    className={cn(
      "group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
      className,
    )}
    {...props}
  />
);

export const AlertDescription = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-description"
    className={cn(
      "text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3",
      className,
    )}
    {...props}
  />
);

export const AlertAction = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="alert-action" className={cn("absolute top-2 end-2", className)} {...props} />
);

export const AlertIcon = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="alert-icon" className={cn("shrink-0", className)} {...props} />
);

export const AlertContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-content"
    className={cn("space-y-2 [&_[data-slot=alert-title]]:font-semibold", className)}
    {...props}
  />
);
