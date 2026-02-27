import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormLabelElement({ className, children, ...props }: PlateElementProps) {
  const { editor, element, path } = props;
  const isRequired = element.required as boolean | undefined;
  const placeholder = element.placeholder as string | undefined;
  const isEmpty = editor.api.isEmpty(element);

  const toggleRequired = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    editor.tf.setNodes({ required: !isRequired }, { at: path });
  };

  return (
    <PlateElement
      className={cn(
        "m-0 px-0 py-1 text-sm font-medium text-foreground tracking-[0.14px] leading-[1.15] relative cursor-text caret-current",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-1">
        {isEmpty && placeholder && (
          <span className="absolute text-muted-foreground/90 pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <span className="min-w-px outline-none">{children}</span>
        {isRequired && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleRequired}
            className={cn(
              "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-xs text-red-500 leading-none hover:bg-muted-foreground hover:text-muted",
              "ml-2",
            )}
            contentEditable={false}
          >
            *
          </Button>
        )}
      </div>
    </PlateElement>
  );
}
