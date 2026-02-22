import type { PlateElementProps } from "platejs/react";

import { PlateElement, useFocused, useSelected } from "platejs/react";

import { cn } from "@/lib/utils";

export function FormInputElement({ className, children, ...props }: PlateElementProps) {
  const { attributes, element, ...rest } = props;
  const placeholder = element.placeholder as string | undefined;

  const selected = useSelected();
  const focused = useFocused();

  return (
    <PlateElement
      attributes={{ ...attributes, placeholder }}
      className={cn(
        "relative my-1 flex h-9 w-full max-w-md items-center rounded-lg border-0 bg-white pl-[10px] pr-[8px] py-1 text-base shadow-form-input cursor-text caret-current dark:bg-input/30",
        selected && focused && "ring-ring/50 ring-[3px]",
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
