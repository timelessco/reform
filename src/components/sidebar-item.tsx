import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import * as React from "react";

export interface SidebarItemProps {
  to?: string;
  label: string;
  isNested?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  prefix?: React.ReactNode;
}

export function SidebarItem({
  to,
  label,
  isActive,
  onClick,
  prefix,
  children,
}: SidebarItemProps & { children?: React.ReactNode }) {
  const Component: React.ElementType = to ? Link : "button";
  const componentProps = to ? { to } : { type: "button" as const };

  return (
    <Component
      {...componentProps}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-x-2 rounded-lg px-2 py-[7px] text-[14px] font-[450] transition-colors relative cursor-pointer h-[30px] overflow-clip",
        "text-accent-foreground",
        !isActive && "hover:bg-muted",
        isActive && "bg-secondary text-accent-foreground",
      )}
    >
      <span className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
        <div className="flex items-center justify-center shrink-0">{prefix}</div>
        <span className="truncate leading-tight font-case tracking-[0.14px] font-[450]">
          {label}
        </span>
      </span>
      {children}
    </Component>
  );
}
