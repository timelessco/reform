"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export const Label = ({ className, htmlFor, ...props }: React.ComponentProps<"label">) => (
  <label
    data-slot="label"
    htmlFor={htmlFor}
    className={cn(
      "gap-2 text-sm group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  />
);
