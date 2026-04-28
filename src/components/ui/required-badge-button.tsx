import { useCallback } from "react";

import { NodeApi } from "platejs";
import type { Path, TElement } from "platejs";
import { useEditorRef, useEditorSelector } from "platejs/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type RequiredBadgeButtonProps = {
  required: boolean;
  path: Path;
  className?: string;
  /**
   * When true, fall back to an inline (right-edge, vertically-centered)
   * placement if no formLabel is above. Used by standalone fields like a
   * privacy-policy formOptionItem where the option text *is* the label.
   * Default false: badge hides when no label is above (current behavior for
   * fields whose right edge already hosts a type-icon).
   */
  showWithoutLabel?: boolean;
};

export const RequiredBadgeButton = ({
  required,
  path,
  className,
  showWithoutLabel = false,
}: RequiredBadgeButtonProps) => {
  const editor = useEditorRef();

  // Hide the floating badge when there's no label above — otherwise the
  // asterisk visually collides with the preceding block. Standalone callers
  // pass `showWithoutLabel` and get an inline-right placement instead.
  const hasLabelAbove = useEditorSelector(
    (ed) => {
      const blockIndex = path[0];
      if (blockIndex === undefined || blockIndex <= 0) return false;
      const prev = (ed.children as TElement[])[blockIndex - 1];
      if (!prev || prev.type !== "formLabel") return false;
      return NodeApi.string(prev).trim().length > 0;
    },
    [path[0]],
  );

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.tf.setNodes({ required: !required }, { at: path });
    },
    [editor, required, path],
  );

  if (!hasLabelAbove && !showWithoutLabel) return null;

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
              "absolute flex size-4 cursor-pointer items-center justify-center rounded-[8px] transition-colors z-10",
              hasLabelAbove ? "right-0 -top-[26px]" : "right-2 top-1/2 -translate-y-1/2",
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
