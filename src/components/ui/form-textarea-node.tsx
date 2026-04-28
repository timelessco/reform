import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { AlignLeftIcon } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormInputNode } from "@/hooks/use-form-input-node";
import { cn } from "@/lib/utils";

export const FormTextareaElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const placeholder = element.placeholder as string | undefined;
  const { focused, isSelected } = useFormInputNode(element);

  return (
    <PlateElement
      attributes={{ ...attributes, placeholder, "data-bf-input": "true" }}
      className={cn(
        "relative flex min-h-24 w-full max-w-[464px] items-start rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-text caret-current before:top-2.5",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <span className="block flex-1 min-w-px pt-2.5 pb-2 outline-none text-muted-foreground/50">
        {children}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              contentEditable={false}
              className="shrink-0 flex items-center justify-center text-muted-foreground select-none ml-1 self-start mt-3"
            />
          }
        >
          <AlignLeftIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="left">Long answer</TooltipContent>
      </Tooltip>
    </PlateElement>
  );
};
