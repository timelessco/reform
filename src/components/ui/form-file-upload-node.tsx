import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorSelector, useFocused } from "platejs/react";

import { UploadIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const FormFileUploadElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;

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
        "relative  flex min-h-20 w-full max-w-[464px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border/60 bg-card p-4 cursor-default shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)]",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <div className="hidden">{children}</div>
      <div
        contentEditable={false}
        className="flex flex-col items-center gap-1.5 text-muted-foreground/50 select-none"
      >
        <UploadIcon className="size-5" />
        <span className="text-sm">Click or drag to upload</span>
        <span className="text-xs">PNG, JPG, PDF up to 10MB</span>
      </div>
    </PlateElement>
  );
};
