import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { RegisteredRouter, ValidateLinkOptions } from "@tanstack/react-router";
import * as React from "react";
import { SidebarMenuButton } from "./ui/sidebar";

export interface SidebarItemProps<
  TRouter extends RegisteredRouter = RegisteredRouter,
  TOptions = unknown,
> {
  linkOptions?: ValidateLinkOptions<TRouter, TOptions>;
  label: string;
  isNested?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  prefix?: React.ReactNode;
}

export function SidebarItem<TRouter extends RegisteredRouter, TOptions>(
  props: SidebarItemProps<TRouter, TOptions> & { children?: React.ReactNode },
): React.ReactNode;
export function SidebarItem({
  linkOptions,
  label,
  isActive,
  onClick,
  prefix,
  children,
}: SidebarItemProps & { children?: React.ReactNode }): React.ReactNode {
  const Component: React.ElementType = linkOptions ? Link : SidebarMenuButton;
  const componentProps = linkOptions ?? { type: "button" as const };

  return (
    <Component
      {...componentProps}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-x-2 rounded-lg px-2 py-[7px] text-base tracking-[0.14px] font-[450] transition-colors relative cursor-pointer h-[30px] overflow-clip",
        "text-sidebar-foreground",
        !isActive && "hover:bg-secondary",
        isActive && "bg-secondary text-sidebar-foreground",
      )}
    >
      <span className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
        <div className="flex items-center justify-center shrink-0 [&>svg]:size-[18px]">
          {prefix}
        </div>
        <span className="truncate font-case">{label}</span>
      </span>
      {children}
    </Component>
  );
}
