import { useCallback } from "react";

import type { Path, TElement } from "platejs";
import { useEditorRef, useEditorSelector } from "platejs/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FORM_INPUT_NODE_TYPES } from "@/lib/form-schema/form-field-constants";
import { cn } from "@/lib/utils";

const RequiredBadge = ({
  required,
  onToggle,
  className,
}: {
  required: boolean;
  onToggle: (e: React.MouseEvent) => void;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <button
          aria-label={required ? "Required field" : "Mark as required"}
          className={cn(
            "absolute z-10 flex size-4 cursor-pointer items-center justify-center rounded-[8px] transition-colors",
            required
              ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
              : "bg-neutral-200 text-neutral-400 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-600",
            className,
          )}
          contentEditable={false}
          data-bf-drag-ignore="true"
          onClick={onToggle}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="10"
            viewBox="0 0 16 16"
            width="10"
            xmlns="http://www.w3.org/2000/svg"
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

type StandaloneInputBadgeProps = {
  required: boolean;
  path: Path;
  /**
   * True when the caller has determined this input is standalone (no label
   * above) and still wants an inline badge — currently only the
   * agreement-style checkbox option item opts in. Otherwise the badge for a
   * labeled input is rendered on the `formLabel` itself via
   * `LabelRequiredBadge`, which avoids the layout gap that appeared when the
   * label was reordered above an input that carried its own absolute badge.
   */
  showWithoutLabel?: boolean;
};

export const RequiredBadgeButton = ({
  required,
  path,
  showWithoutLabel = false,
}: StandaloneInputBadgeProps) => {
  const editor = useEditorRef();

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.tf.setNodes({ required: !required }, { at: path });
    },
    [editor, required, path],
  );

  if (!showWithoutLabel) return null;

  return (
    <RequiredBadge
      className="right-2 top-1/2 -translate-y-1/2"
      onToggle={toggle}
      required={required}
    />
  );
};

/**
 * Renders the required badge on a `formLabel`, deriving its state from the
 * immediately-following input node. The input node remains the source of
 * truth for `required`; the label just reads + toggles its neighbor.
 */
export const LabelRequiredBadge = ({ labelPath }: { labelPath: Path }) => {
  const editor = useEditorRef();

  const next = useEditorSelector(
    (ed) => {
      const idx = labelPath[0];
      if (typeof idx !== "number") return null;
      const sibling = (ed.children as TElement[])[idx + 1];
      if (!sibling || !FORM_INPUT_NODE_TYPES.has(sibling.type)) return null;
      return {
        required: Boolean((sibling as TElement & { required?: boolean }).required),
        siblingPath: [idx + 1] as Path,
      };
    },
    [labelPath[0]],
  );

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!next) return;
      editor.tf.setNodes({ required: !next.required }, { at: next.siblingPath });
    },
    [editor, next],
  );

  if (!next) return null;

  return (
    <RequiredBadge
      className="right-0 top-1/2 -translate-y-1/2"
      onToggle={toggle}
      required={next.required}
    />
  );
};
