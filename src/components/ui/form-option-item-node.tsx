import type { TElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorRef, useEditorSelector } from "platejs/react";
import { useLayoutEffect } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { CheckCheckIcon, ChevronsUpDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type OptionVariant = "checkbox" | "multiChoice" | "multiSelect" | "ranking";

const MULTI_SELECT_COLORS = [
  { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" },
];

const LETTER_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const OptionIcon = ({ variant, index }: { variant: OptionVariant; index: number }) => {
  switch (variant) {
    case "checkbox":
      return (
        <span className="flex size-5 shrink-0 items-center justify-center">
          <Checkbox disabled className="pointer-events-none after:hidden" />
        </span>
      );
    case "multiChoice": {
      const letter = LETTER_LABELS[index % LETTER_LABELS.length];
      return (
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-semibold text-muted-foreground">
          {letter}
        </span>
      );
    }
    case "multiSelect": {
      const color = MULTI_SELECT_COLORS[index % MULTI_SELECT_COLORS.length];
      return (
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded",
            color.bg,
            color.text,
          )}
        >
          <CheckCheckIcon className="size-3.5" />
        </span>
      );
    }
    case "ranking":
      return (
        <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border/50 text-muted-foreground">
          <ChevronsUpDownIcon className="size-3.5" />
        </span>
      );
    default:
      return null;
  }
};

export { MULTI_SELECT_COLORS, LETTER_LABELS };

export const FormOptionItemElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const variant = (element.variant as OptionVariant) || "checkbox";
  const elementId = (element as { id?: string }).id;

  // Single consolidated selector for all derived state
  const { optionIndex, isLastInGroup, isGroupFocused } = useEditorSelector(
    (ed) => {
      const path = ed.api.findPath(element);
      if (!path) return { optionIndex: 0, isLastInGroup: false, isGroupFocused: false };

      const nodes = ed.children as TElement[];

      // Option index: count consecutive formOptionItem siblings before this one
      let idx = 0;
      for (let i = path[0] - 1; i >= 0; i--) {
        if (nodes[i].type === "formOptionItem") idx++;
        else break;
      }

      // Last in group: next sibling is not formOptionItem
      const nextNode = nodes[path[0] + 1];
      const isLast = !nextNode || nextNode.type !== "formOptionItem";

      // Group focused: a formOptionItem in the SAME contiguous group has focus
      let groupFocused = false;
      if (ed.selection) {
        const focusIndex = ed.selection.focus.path[0];
        const focusNode = nodes[focusIndex];
        if (focusNode?.type === "formOptionItem") {
          // Find this group's start and end indices
          let groupStart = path[0];
          while (groupStart > 0 && nodes[groupStart - 1].type === "formOptionItem") groupStart--;
          let groupEnd = path[0];
          while (groupEnd < nodes.length - 1 && nodes[groupEnd + 1].type === "formOptionItem")
            groupEnd++;
          groupFocused = focusIndex >= groupStart && focusIndex <= groupEnd;
        }
      }

      return {
        optionIndex: idx,
        isLastInGroup: isLast,
        isGroupFocused: groupFocused,
      };
    },
    [elementId],
  );

  const showGhost = isLastInGroup && isGroupFocused;

  // When the ghost is visible, push the NEXT block (pageBreak / formButton / etc.)
  // down so the ghost doesn't overlap it. We walk up to the block-draggable
  // wrapper and add margin-top to its next sibling instead of expanding this
  // element, which would displace the drag-handle gutter (h-full of the block
  // wrapper).
  const editor = useEditorRef();
  useLayoutEffect(() => {
    let domNode: HTMLElement | null = null;
    try {
      // eslint-disable-next-line typescript-eslint/no-explicit-any
      domNode = (editor.api as any).toDOMNode?.(element) ?? null;
    } catch {
      domNode = null;
    }
    if (!domNode) return;
    const blockWrapper = domNode.closest(".slate-blockWrapper");
    const draggableWrapper = blockWrapper?.parentElement;
    const nextSibling = draggableWrapper?.nextElementSibling as HTMLElement | null;
    if (!nextSibling) return;
    if (showGhost) {
      nextSibling.style.marginTop = "30px";
    } else {
      nextSibling.style.marginTop = "";
    }
    return () => {
      nextSibling.style.marginTop = "";
    };
  }, [editor, element, showGhost]);

  // For multiSelect, apply colored background to the option row
  const colorStyle =
    variant === "multiSelect"
      ? MULTI_SELECT_COLORS[optionIndex % MULTI_SELECT_COLORS.length]
      : null;

  return (
    <PlateElement
      attributes={{ ...attributes, "data-bf-input": "true" }}
      className={cn(
        "relative my-0.5 w-full max-w-[464px] cursor-text caret-current rounded-md before:left-[30px] before:top-[14px] before:-translate-y-1/2 before:text-sm",
        colorStyle && cn(colorStyle.bg, colorStyle.text),
        className,
      )}
      element={element}
      {...rest}
    >
      <div className="flex h-7 items-center gap-2 pl-[2px]">
        <span contentEditable={false} className="shrink-0 select-none pointer-events-none">
          <OptionIcon variant={variant} index={optionIndex} />
        </span>
        <span className="flex-1 min-w-0 outline-none text-sm">{children}</span>
      </div>

      {showGhost && (
        <div
          contentEditable={false}
          className="absolute left-0 right-0 top-full flex h-7 items-center gap-2 pl-[2px] opacity-40 select-none pointer-events-none"
        >
          <OptionIcon variant={variant} index={optionIndex + 1} />
          <span className="text-sm text-muted-foreground">Add option</span>
        </div>
      )}
    </PlateElement>
  );
};
