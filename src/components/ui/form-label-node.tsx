import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { RequiredBadgeWrapper } from "@/components/ui/required-badge-wrapper";
import { cn } from "@/lib/utils";

export const FormLabelElement = ({ className, children, ...props }: PlateElementProps) => {
  const { editor, element, path } = props;
  const placeholder = element.placeholder as string | undefined;
  const isEmpty = editor.api.isEmpty(element);

  return (
    <RequiredBadgeWrapper path={path}>
      <PlateElement
        className={cn(
          "m-0 px-0  text-sm text-foreground relative cursor-text caret-current",
          className,
        )}
        {...props}
      >
        <div className="flex my-2 items-center gap-1">
          {isEmpty && placeholder && (
            <span className="absolute text-muted-foreground/90 pointer-events-none select-none">
              {placeholder}
            </span>
          )}
          <span className="min-w-px outline-none">{children}</span>
        </div>
      </PlateElement>
    </RequiredBadgeWrapper>
  );
};
