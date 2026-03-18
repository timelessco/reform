import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { CheckIcon } from "@/components/ui/icons";
import { Search } from "lucide-react";

export const Command = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) => (
  <CommandPrimitive
    data-slot="command"
    className={cn(
      "bg-popover text-popover-foreground rounded-xl! p-1 flex size-full flex-col overflow-hidden",
      className,
    )}
    {...props}
  />
);

export const CommandDialog = ({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}) => (
  <Dialog {...props}>
    <DialogHeader className="sr-only">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
    <DialogContent
      className={cn("rounded-xl! top-1/3 translate-y-0 overflow-hidden p-0", className)}
      showCloseButton={showCloseButton}
    >
      {children}
    </DialogContent>
  </Dialog>
);

export const CommandInput = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) => (
  <div data-slot="command-input-wrapper" className="p-1 pb-0">
    <ButtonGroup className="w-full border-none rounded-lg">
      <ButtonGroupText className="h-7 w-full rounded-lg border border-transparent bg-accent/60 px-2.5 gap-1.5 text-[13px]">
        <Search className="size-4" strokeWidth={2} color="var(--color-gray-alpha-600)" />
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "min-w-0 flex-1 bg-transparent border-0 p-0 outline-none text-[13px] placeholder:text-(--color-gray-alpha-600) placeholder:text-normal placeholder:text-[0.8rem] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </ButtonGroupText>
    </ButtonGroup>
  </div>
);

export const CommandList = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List
    data-slot="command-list"
    className={cn(
      "no-scrollbar max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto",
      className,
    )}
    {...props}
  />
);

export const CommandEmpty = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) => (
  <CommandPrimitive.Empty
    data-slot="command-empty"
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
);

export const CommandGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) => (
  <CommandPrimitive.Group
    data-slot="command-group"
    className={cn(
      "text-foreground **:[[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs",
      className,
    )}
    {...props}
  />
);

export const CommandSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) => (
  <CommandPrimitive.Separator
    data-slot="command-separator"
    className={cn("bg-border -mx-1 h-px", className)}
    {...props}
  />
);

export const CommandItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    data-slot="command-item"
    className={cn(
      "data-selected:bg-(--color-gray-alpha-100) data-selected:text-foreground data-selected:*:[svg]:text-foreground relative flex cursor-default items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! [&_svg:not([class*='size-'])]:size-4 group/command-item data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-(--color-gray-alpha-100) hover:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
    <CheckIcon className="ms-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
  </CommandPrimitive.Item>
);

export const CommandShortcut = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    data-slot="command-shortcut"
    className={cn(
      "text-muted-foreground group-data-selected/command-item:text-foreground ms-auto text-xs tracking-widest",
      className,
    )}
    {...props}
  />
);
