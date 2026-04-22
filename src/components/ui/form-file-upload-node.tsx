import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { UploadIcon } from "@/components/ui/icons";
import { RequiredBadgeButton } from "@/components/ui/required-badge-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormInputNode } from "@/hooks/use-form-input-node";
import { cn } from "@/lib/utils";

export const FormFileUploadElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const { focused, isSelected, required } = useFormInputNode(element);

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
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              contentEditable={false}
              className="absolute top-2 right-2 flex items-center justify-center text-muted-foreground select-none"
            />
          }
        >
          <UploadIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="left">File upload</TooltipContent>
      </Tooltip>
      <RequiredBadgeButton required={required} path={props.path} />
    </PlateElement>
  );
};
