import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorSelector, useFocused } from "platejs/react";

import { cn } from "@/lib/utils";

export function FormTextareaElement({ className, children, ...props }: PlateElementProps) {
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
      attributes={{ ...attributes, placeholder }}
      className={cn(
        "relative my-1 flex min-h-24 w-full max-w-md items-start rounded-lg border-0 bg-card pl-[10px] pr-[8px] py-2 text-base shadow-form-input cursor-text caret-current",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      data-bf-input="true"
      {...rest}
    >
      <span className="flex-1 min-w-px outline-none text-muted-foreground/50">{children}</span>
    </PlateElement>
  );
}
