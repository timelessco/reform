import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorSelector, useFocused } from "platejs/react";

import { HashIcon } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const FormNumberElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const placeholder = element.placeholder as string | undefined;

  const focused = useFocused();
  const isSelected = useEditorSelector(
    (ed) => {
      if (!ed.selection) return false;
      const path = ed.api.findPath(element);
      if (!path) return false;
      const focusPath = ed.selection.focus.path;
      if (focusPath.length < path.length) return false;
      for (let i = 0; i < path.length; i++) {
        if (focusPath[i] !== path[i]) return false;
      }
      return true;
    },
    [element],
  );

  return (
    <PlateElement
      attributes={{ ...attributes, placeholder, "data-bf-input": "true" }}
      className={cn(
        "relative  flex h-7 w-full max-w-[464px] items-center overflow-hidden rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-text caret-current",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <span className="flex-1 min-w-0 outline-none text-muted-foreground/50 line-clamp-1 break-all">
        {children}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              contentEditable={false}
              className="shrink-0 flex items-center justify-center text-muted-foreground select-none ml-1"
            />
          }
        >
          <HashIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="left">Number</TooltipContent>
      </Tooltip>
    </PlateElement>
  );
};
