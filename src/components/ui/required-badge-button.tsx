import { useCallback } from "react";

import { useEditorRef } from "platejs/react";
import type { Path } from "platejs";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type RequiredBadgeButtonProps = {
  required: boolean;
  path: Path;
  className?: string;
};

export const RequiredBadgeButton = ({ required, path, className }: RequiredBadgeButtonProps) => {
  const editor = useEditorRef();

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.tf.setNodes({ required: !required }, { at: path });
    },
    [editor, required, path],
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            contentEditable={false}
            onClick={toggle}
            aria-label={required ? "Required field" : "Mark as required"}
            className={cn(
              "absolute right-0 -top-[26px] flex size-4 cursor-pointer items-center justify-center rounded-[8px] transition-colors z-10",
              required
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                : "bg-neutral-200 text-neutral-400 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-600",
              className,
            )}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12.3892 5.68944L12.793 6.92754L9.02484 8.21946L11.4741 11.53L10.4244 12.3375L7.94824 8.91925L5.57971 12.3106L4.53002 11.5031L6.89855 8.21946L3.15735 6.95445L3.58799 5.68944L7.27536 7.00828V3.02484H8.64803V6.98137L12.3892 5.68944Z"
                fill="currentColor"
              />
            </svg>
          </button>
        }
      />
      <TooltipContent side="right">{required ? "Required" : "Mark as required"}</TooltipContent>
    </Tooltip>
  );
};
