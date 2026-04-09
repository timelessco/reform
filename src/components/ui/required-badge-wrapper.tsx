import type { Path } from "platejs";

import { useEditorRef, useEditorSelector } from "platejs/react";
import { useCallback, useMemo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FORM_INPUT_NODE_TYPES } from "@/lib/form-schema/form-field-constants";
import { cn } from "@/lib/utils";

type RequiredBadgeWrapperProps = {
  children: React.ReactNode;
  path: Path;
};

export const RequiredBadgeWrapper = ({
  children,
  path,
}: RequiredBadgeWrapperProps): React.ReactNode => {
  const editor = useEditorRef();

  // Stable index for the next sibling — avoids new array reference each render
  const nextSiblingIndex = path[path.length - 1] + 1;

  const nextSiblingPath = useMemo(
    () => [...path.slice(0, -1), nextSiblingIndex] as Path,
    // path from Plate is stable per element, but use index as the real dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextSiblingIndex],
  );

  const labelPath = useMemo(
    () => [...path] as Path,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextSiblingIndex],
  );

  const { isNextSiblingFormInput, isRequired } = useEditorSelector(
    (ed) => {
      try {
        const entry = ed.api.node(nextSiblingPath);
        if (!entry) {
          return { isNextSiblingFormInput: false, isRequired: false };
        }
        const [node] = entry;
        const nodeType = (node as { type?: string }).type ?? "";
        const isFormInput = FORM_INPUT_NODE_TYPES.has(nodeType);
        if (!isFormInput) {
          return { isNextSiblingFormInput: false, isRequired: false };
        }
        // Read required from input node first; fall back to label node so display
        // stays consistent when only one of them carries the flag.
        const inputRequired = (node as { required?: boolean }).required;
        if (inputRequired != null) {
          return { isNextSiblingFormInput: true, isRequired: Boolean(inputRequired) };
        }
        const labelEntry = ed.api.node(labelPath);
        const labelNode = labelEntry?.[0] as { required?: boolean } | undefined;
        return {
          isNextSiblingFormInput: true,
          isRequired: Boolean(labelNode?.required),
        };
      } catch {
        return { isNextSiblingFormInput: false, isRequired: false };
      }
    },
    [nextSiblingPath, labelPath],
  );

  const toggleRequired = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !isRequired;
      // Write to BOTH the input node and the label node so the two stay in sync.
      // This avoids stale label.required leaking into preview/published views
      // when the badge was toggled on the input only.
      editor.tf.setNodes({ required: next }, { at: nextSiblingPath });
      editor.tf.setNodes({ required: next }, { at: labelPath });
    },
    [editor, isRequired, nextSiblingPath, labelPath],
  );

  if (!isNextSiblingFormInput) {
    return <>{children}</>;
  }

  return (
    <div className="relative" style={{ maxWidth: "var(--bf-input-width)" }}>
      {children}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              contentEditable={false}
              onClick={toggleRequired}
              aria-label={isRequired ? "Required field" : "Mark as required"}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 flex size-4 cursor-pointer items-center justify-center rounded-[8px] transition-colors",
                isRequired
                  ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                  : "bg-neutral-200 text-neutral-400 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-600",
              )}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
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
        <TooltipContent side="right">{isRequired ? "Required" : "Mark as required"}</TooltipContent>
      </Tooltip>
    </div>
  );
};
