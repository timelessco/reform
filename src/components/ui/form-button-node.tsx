import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { Descendant } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef, useEditorSelector } from "platejs/react";
import * as React from "react";
import * as v from "valibot";
import {
  findNextFocusTarget,
  findPrevFocusTarget,
  goToFocusTarget,
} from "@/components/editor/plugins/form-blocks-utils";
import { cn } from "@/lib/utils";

export type ButtonRole = "next" | "previous" | "submit";

export interface FormButtonElementData {
  type: "formButton";
  buttonRole: ButtonRole;
  label?: string;
  children: [{ text: string }];
}

export const createFormButtonNode = (role: ButtonRole, text?: string): FormButtonElementData => {
  const defaultText = role === "next" ? "Next" : role === "previous" ? "Back" : "Submit";

  return {
    type: "formButton",
    buttonRole: role,
    label: text ?? defaultText,
    children: [{ text: "" }],
  };
};

const getPlaceholderForRole = (role: ButtonRole): string => {
  switch (role) {
    case "next":
      return "Next";
    case "previous":
      return "Back";
    case "submit":
      return "Submit";
    default:
      return "Button";
  }
};

const isButtonRole = (value: unknown): value is ButtonRole =>
  value === "next" || value === "previous" || value === "submit";

const extractTextFromChildren = (children: readonly Descendant[]): string =>
  children.map((child) => ("text" in child ? child.text : "")).join("");

const isPageBreakNode = (node: Descendant): boolean => "type" in node && node.type === "pageBreak";

const isString = (value: unknown): value is string => v.is(v.string(), value);

export const FormButtonElement = ({ children, ...props }: PlateElementProps) => {
  const { element } = props;
  const editor = useEditorRef();
  const buttonRole = isButtonRole(element.buttonRole) ? element.buttonRole : "submit";
  const placeholder = getPlaceholderForRole(buttonRole);

  const isPrevious = buttonRole === "previous";

  const isMultiStep = useEditorSelector((ed) => ed.children.some(isPageBreakNode), []);

  // Get label from element property (fallback to children for backwards compat)
  const rawLabel = isString(element.label)
    ? element.label
    : extractTextFromChildren(element.children);

  // Back button is a fixed nav affordance; surface "Back" for legacy "Previous"/empty labels so
  // the editor matches the preview/live (which always render "Back").
  const label = isPrevious && (!rawLabel || rawLabel === "Previous") ? "Back" : rawLabel;

  // The native input edits element.label directly, the property the transform reads first (Slate
  // ignores the input; its parent is contentEditable=false). Local state keeps the caret; synced
  // back from the node on external changes (undo, etc.) while the input isn't focused.
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState(label);
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) setInputValue(label);
  }, [label]);

  const writeLabel = React.useCallback(
    (next: string) => {
      const path = editor.api.findPath(element);

      if (path) editor.tf.setNodes({ label: next }, { at: path });
    },
    [editor, element],
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      writeLabel(e.target.value);
    },
    [writeLabel],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      // Keep Plate's editor handlers off keys typed in the void node (incl. Backspace deleting it).
      e.stopPropagation();

      if (e.key === "Enter") {
        e.preventDefault();
        inputRef.current?.blur();

        return;
      }

      // Tab joins the button into the editor tab order (Previous, then action button, then next page).
      if (e.key === "Tab") {
        const path = editor.api.findPath(element);

        if (!path) return;

        const target = e.shiftKey
          ? findPrevFocusTarget(editor, path[0])
          : findNextFocusTarget(editor, path[0]);

        if (target) {
          e.preventDefault();
          goToFocusTarget(editor, target, e.shiftKey);
        }
        // No internal target (Tab forward off the final Submit, or a button with nothing focusable
        // before it). Leave preventDefault off so native Tab carries focus out to the surrounding
        // UI instead of trapping it on the input (WCAG 2.1.2, no keyboard trap).
      }
    },
    [editor, element],
  );

  // Stop pointer events from reaching Slate (cursor placement / block selection) so the input
  // focuses normally. Don't preventDefault; that would block focus.
  const stopPointer = React.useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

  // Chrome (the py-2.5 gutter around the pill) shouldn't place a Slate caret on mousedown.
  const handleChromeMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Justify the single child via --bf-button-justify (the Buttons Alignment setting). Fallback keeps
  // the default (multi-step right, single-step left). Scoped to the button. The Back pill floats
  // left and needs no justify override.
  const chromeAttributes = isPrevious
    ? { ...props.attributes, "data-bf-chrome": "" }
    : {
        ...props.attributes,
        "data-bf-chrome": "",
        style: {
          ...props.attributes?.style,
          justifyContent: `var(--bf-button-justify, ${isMultiStep ? "flex-end" : "flex-start"})`,
        },
      };

  return (
    <PlateElement
      className={cn("m-0 px-0", isPrevious ? "float-left" : "flex overflow-hidden")}
      {...props}
      attributes={chromeAttributes}
    >
      {/* Hidden children to maintain Slate structure */}
      <span className="hidden">{children}</span>
      <div
        className="group inline-flex items-center gap-1 py-2.5"
        contentEditable={false}
        // presentation (not aria-hidden) keeps the inner input accessible while neutralizing the div.
        role="presentation"
        onMouseDown={handleChromeMouseDown}
      >
        {/* <label> so a click anywhere on the pill (icons/padding) natively focuses the input;
            stopPropagation (no preventDefault) lets that native focus through past the chrome guard. */}
        <label
          data-bf-button={isPrevious ? undefined : ""}
          onMouseDown={stopPointer}
          className={cn(
            "inline-flex h-8 cursor-text items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors select-none",
            isPrevious
              ? "border border-input bg-background text-foreground shadow-xs"
              : "bg-primary text-primary-foreground",
          )}
        >
          {isPrevious && <ChevronLeftIcon className="size-4" />}
          <input
            ref={inputRef}
            value={inputValue}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onMouseDown={stopPointer}
            onPointerDown={stopPointer}
            onClick={stopPointer}
            aria-label="Button label"
            // letter-spacing:normal. The unlayered `.bf-themed * { letter-spacing }` rule makes
            // field-sizing-content undersize ~1px and clip the last glyph (Submit shows "Submi").
            // The `!` keeps this utility beating that unlayered rule, as the inline style it
            // replaced did.
            className="field-sizing-content min-w-[2ch] cursor-text bg-transparent text-center [letter-spacing:normal]! text-inherit outline-none placeholder:text-current/60"
          />
          {buttonRole === "submit" && <CheckIcon className="size-4" />}
          {buttonRole === "next" && <ChevronRightIcon className="size-4" />}
        </label>
      </div>
    </PlateElement>
  );
};
