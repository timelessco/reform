import type { Path, TElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorRef, useEditorSelector, useFocused } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { findPrevNonButtonPath, moveToPath } from "@/components/editor/plugins/form-blocks-kit";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

import { MULTI_SELECT_COLORS } from "./form-option-item-node";

export const FormMultiSelectInputElement = ({
  className,
  children,
  ...props
}: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const editor = useEditorRef();
  const options = (element.options as string[]) ?? [];
  const elementId = (element as { id?: string }).id;
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  const focused = useFocused();
  const isSelected = useEditorSelector(
    (ed) => {
      if (!ed.selection) return false;
      const path = ed.api.findPath(element);
      if (!path) return false;
      const focusPath = ed.selection.focus.path;
      if (focusPath.length < path.length) return false;
      for (let i = 0; i < path.length; i++) {
        if (focusPath[i] !== path[i]) return false;
      }
      return true;
    },
    [elementId],
  );

  // Auto-focus internal input when Plate selects this void node
  useEffect(() => {
    if (isSelected && focused) {
      inputRef.current?.focus();
    }
  }, [isSelected, focused]);

  const setNodeOptions = useCallback(
    (newOptions: string[]) => {
      const path = editor.api.findPath(element);
      if (path) {
        editor.tf.setNodes({ options: newOptions }, { at: path });
      }
    },
    [editor, element],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      const trimmed = inputValue.trim();
      if (!trimmed || options.includes(trimmed)) return;
      setNodeOptions([...options, trimmed]);
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      if (options.length > 0) {
        setNodeOptions(options.slice(0, -1));
      } else {
        inputRef.current?.blur();
        const path = editor.api.findPath(element);
        if (path) {
          editor.tf.select(path);
          editor.tf.removeNodes({ at: path });
          if (path[0] > 0) {
            const prevPath = findPrevNonButtonPath(editor, path);
            if (prevPath) {
              const edges = editor.api.edges(prevPath);
              if (edges?.[1]) {
                editor.tf.select(edges[1]);
              }
            }
          }
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.blur();
      const path = editor.api.findPath(element);
      if (path) {
        if (e.shiftKey) {
          const prevPath = findPrevNonButtonPath(editor, path);
          if (prevPath) {
            moveToPath(editor, prevPath);
          }
        } else {
          // Find next content block on the SAME page (stop at formButton/pageBreak)
          const editorChildren = editor.children as TElement[];
          let samePage: Path | null = null;
          let boundaryIndex = editorChildren.length;
          for (let i = path[0] + 1; i < editorChildren.length; i++) {
            const node = editorChildren[i];
            if (node.type === "formButton" || node.type === "pageBreak") {
              boundaryIndex = i;
              break;
            }
            if (node.type !== "formHeader") {
              samePage = [i];
              break;
            }
          }
          if (samePage) {
            moveToPath(editor, samePage);
          } else {
            // No content block before page boundary — create one
            const insertPath: Path = [boundaryIndex];
            editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as TElement, {
              at: insertPath,
            });
            moveToPath(editor, insertPath);
          }
        }
      }
    }
  };

  const handleRemoveOption = (index: number) => {
    setNodeOptions(options.filter((_, i) => i !== index));
  };

  return (
    <PlateElement
      attributes={{ ...attributes, "data-bf-input": "true" }}
      className={cn(
        "relative my-1 flex w-full max-w-[464px] min-h-7 items-center rounded-[var(--radius-lg)] border-0 bg-card px-2 py-1 text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-default",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <div className="hidden">{children}</div>
      <div
        contentEditable={false}
        role="group"
        className="flex flex-1 flex-wrap items-center gap-1"
        onClick={() => inputRef.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.focus();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {options.map((opt) => {
          const optIndex = options.indexOf(opt);
          const color = MULTI_SELECT_COLORS[optIndex % MULTI_SELECT_COLORS.length];
          return (
            <span
              key={opt}
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                color.bg,
                color.text,
              )}
            >
              {opt}
              <button
                type="button"
                className="ml-1 inline-flex size-3 items-center justify-center rounded-full hover:bg-black/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveOption(optIndex);
                }}
                aria-label={`Remove ${opt}`}
              >
                <XIcon className="size-2.5" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={
            options.length === 0 ? "Type and press Enter to add options" : "Add option..."
          }
          className="min-w-[80px] flex-1 border-0 bg-transparent p-0 text-sm text-muted-foreground/50 outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    </PlateElement>
  );
};
