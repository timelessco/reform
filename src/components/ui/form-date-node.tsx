import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { CalendarIcon } from "@/components/ui/icons";
import { RequiredBadgeButton } from "@/components/ui/required-badge-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormInputNode } from "@/hooks/use-form-input-node";
import { cn } from "@/lib/utils";

export const FormDateElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const placeholder = element.placeholder as string | undefined;
  const { focused, isSelected, required } = useFormInputNode(element);

  return (
    <PlateElement
      attributes={{
        ...attributes,
        placeholder: placeholder ?? "Select a date",
        "data-bf-input": "true",
      }}
      className={cn(
        "relative flex h-7 w-full max-w-[464px] items-center rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-text caret-current",
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
          <CalendarIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="left">Date</TooltipContent>
      </Tooltip>
      <RequiredBadgeButton required={required} path={props.path} />
    </PlateElement>
  );
};
