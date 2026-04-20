import type { PlateElementProps } from "platejs/react";

import { PlateElement, useSelected } from "platejs/react";

import { cn } from "@/lib/utils";

export const FormLabelElement = ({ className, children, ...props }: PlateElementProps) => {
  const { editor, element } = props;
  const placeholder = element.placeholder as string | undefined;
  const isEmpty = editor.api.isEmpty(element);
  const isSelected = useSelected();

  return (
    <PlateElement
      className={cn(
        "m-0 px-0  text-sm text-foreground relative cursor-text caret-current",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-1">
        {isEmpty && placeholder && isSelected && (
          <span className="absolute text-muted-foreground/90 pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <span className="min-w-px outline-none">{children}</span>
      </div>
    </PlateElement>
  );
};
