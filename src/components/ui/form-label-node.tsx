import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const FormLabelElement = ({ className, children, ...props }: PlateElementProps) => {
  const { editor, element, path } = props;
  const isRequired = element.required as boolean | undefined;
  const placeholder = element.placeholder as string | undefined;
  const isEmpty = editor.api.isEmpty(element);

  const toggleRequired = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.tf.setNodes({ required: !isRequired }, { at: path });
    },
    [editor, isRequired, path],
  );

  return (
    <PlateElement
      className={cn(
        "m-0 px-0 py-1 text-sm text-foreground relative cursor-text caret-current",
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
              "flex size-4 shrink-0 cursor-pointer px-1 py-1.5 items-center justify-center overflow-hidden rounded-lg bg-neutral-300 text-white hover:bg-neutral-400 dark:bg-neutral-600 dark:hover:bg-neutral-500",
              "ml-auto mr-1",
            )}
            contentEditable={false}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.3892 5.68944L12.793 6.92754L9.02484 8.21946L11.4741 11.53L10.4244 12.3375L7.94824 8.91925L5.57971 12.3106L4.53002 11.5031L6.89855 8.21946L3.15735 6.95445L3.58799 5.68944L7.27536 7.00828V3.02484H8.64803V6.98137L12.3892 5.68944Z"
                fill="white"
              />
            </svg>
          </Button>
        )}
      </div>
    </PlateElement>
  );
};
