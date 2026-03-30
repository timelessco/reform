import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorSelector, useFocused } from "platejs/react";

import { ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const FormTimeElement = ({ className, children, ...props }: PlateElementProps) => {
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
      attributes={{ ...attributes, "data-bf-input": "true" }}
      className={cn(
        "relative my-1 flex h-7 w-full max-w-[464px] items-center rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-default",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <div className="hidden">{children}</div>
      <div
        contentEditable={false}
        className="flex items-center gap-2 text-muted-foreground/50 select-none"
      >
        <ClockIcon className="size-3.5" />
        <span>{placeholder ?? "Select a time"}</span>
      </div>
    </PlateElement>
  );
};
