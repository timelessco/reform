import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export const ItemGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    role="list"
    data-slot="item-group"
    className={cn(
      "gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2 group/item-group flex w-full flex-col",
      className,
    )}
    {...props}
  />
);

export const ItemSeparator = ({ className, ...props }: React.ComponentProps<typeof Separator>) => (
  <Separator
    data-slot="item-separator"
    orientation="horizontal"
    className={cn("my-2", className)}
    {...props}
  />
);

const itemVariants = cva(
  "[a]:hover:bg-muted rounded-lg border text-sm w-full group/item focus-visible:border-ring focus-visible:ring-ring/50 flex items-center flex-wrap outline-none transition-colors duration-100 focus-visible:ring-[3px] [a]:transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent",
        outline: "border-border",
        muted: "bg-muted/50 border-transparent",
      },
      size: {
        default: "gap-2.5 px-3 py-2.5",
        sm: "gap-2.5 px-3 py-2.5",
        xs: "gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export const Item = ({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) =>
  useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props,
    ),
    render,
    state: {
      slot: "item",
      variant,
      size,
    },
  });

const itemMediaVariants = cva(
  "gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const ItemMedia = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) => (
  <div
    data-slot="item-media"
    data-variant={variant}
    className={cn(itemMediaVariants({ variant, className }))}
    {...props}
  />
);

export const ItemContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-content"
    className={cn(
      "gap-1 group-data-[size=xs]/item:gap-0 flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none",
      className,
    )}
    {...props}
  />
);

export const ItemTitle = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-title"
    className={cn(
      "gap-2 text-sm underline-offset-4 line-clamp-1 flex w-fit items-center",
      className,
    )}
    {...props}
  />
);

export const ItemDescription = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p
    data-slot="item-description"
    className={cn(
      "text-muted-foreground text-start text-sm group-data-[size=xs]/item:text-xs [&>a:hover]:text-primary line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4",
      className,
    )}
    {...props}
  />
);

export const ItemActions = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="item-actions" className={cn("gap-2 flex items-center", className)} {...props} />
);

export const ItemHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-header"
    className={cn("gap-2 flex basis-full items-center justify-between", className)}
    {...props}
  />
);

export const ItemFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="item-footer"
    className={cn("gap-2 flex basis-full items-center justify-between", className)}
    {...props}
  />
);
