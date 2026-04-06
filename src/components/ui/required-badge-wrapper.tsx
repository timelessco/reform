import type { Path } from "platejs";

import { useEditorRef, useEditorSelector } from "platejs/react";
import { useCallback, useMemo } from "react";

import { FORM_INPUT_NODE_TYPES } from "@/lib/form-field-constants";
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
        return {
          isNextSiblingFormInput: isFormInput,
          isRequired: isFormInput ? Boolean((node as { required?: boolean }).required) : false,
        };
      } catch {
        return { isNextSiblingFormInput: false, isRequired: false };
      }
    },
    [nextSiblingPath],
  );

  const toggleRequired = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.tf.setNodes({ required: !isRequired }, { at: nextSiblingPath });
    },
    [editor, isRequired, nextSiblingPath],
  );

  if (!isNextSiblingFormInput) {
    return <>{children}</>;
  }

  return (
    <div className="relative" style={{ maxWidth: "var(--bf-input-width)" }}>
      {children}
      <button
        type="button"
        contentEditable={false}
        onClick={toggleRequired}
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
    </div>
  );
};
