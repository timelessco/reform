import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import type { PlateEditor, PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef } from "platejs/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Checks if the editor contains any pageBreak elements (multi-page form)
 */
function hasPageBreaks(editor: PlateEditor): boolean {
  return editor.children.some(
    (node) =>
      (node as { type?: string }).type === "pageBreak" ||
      (Array.isArray((node as { children?: unknown[] }).children) &&
        (node as { children: Array<{ type?: string }> }).children.some(
          (child) => child.type === "pageBreak",
        )),
  );
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ButtonRole = "next" | "previous" | "submit";

export interface FormButtonElementData {
  type: "formButton";
  buttonRole: ButtonRole;
  label?: string;
  children: [{ text: string }];
}

export function createFormButtonNode(role: ButtonRole, text?: string): FormButtonElementData {
  const defaultText = role === "next" ? "Next" : role === "previous" ? "Previous" : "Submit";
  return {
    type: "formButton",
    buttonRole: role,
    label: text ?? defaultText,
    children: [{ text: "" }],
  };
}

function getPlaceholderForRole(role: ButtonRole): string {
  switch (role) {
    case "next":
      return "Next";
    case "previous":
      return "Previous";
    case "submit":
      return "Submit";
    default:
      return "Button";
  }
}

/**
 * Extracts text content from a node's children
 */
function extractTextFromChildren(children: Array<{ text?: string }>): string {
  if (!Array.isArray(children)) return "";
  return children.map((child) => child.text || "").join("");
}

export function FormButtonElement({ className, children, ...props }: PlateElementProps) {
  const { element } = props;
  const editor = useEditorRef();
  const buttonRole = (element.buttonRole as ButtonRole) ?? "submit";
  const placeholder = getPlaceholderForRole(buttonRole);

  const isPrevious = buttonRole === "previous";
  const isMultiPage = hasPageBreaks(editor);
  // Submit button floats left for single-page forms, right for multi-page
  const isSubmitOnSinglePage = buttonRole === "submit" && !isMultiPage;
  const [isOpen, setIsOpen] = React.useState(false);

  // Get label from element property (fallback to children for backwards compat)
  const label =
    (element.label as string) ??
    extractTextFromChildren(element.children as Array<{ text?: string }>);

  // Local state for input - prevents re-render on every keystroke
  const [inputValue, setInputValue] = React.useState(label);

  // Get display text (use placeholder if empty)
  const displayText = label.trim() || placeholder;

  // Handle label change - uses setNodes on element property (reactive)
  const handleLabelChange = (newLabel: string) => {
    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.setNodes({ label: newLabel }, { at: path });
    }
  };

  // Save and close popover
  const saveAndClose = () => {
    handleLabelChange(inputValue);
    setIsOpen(false);
  };

  const buttonLabelId = React.useId();

  // Gear icon component
  const GearIcon = (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setInputValue(label); // Initialize input when opening
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-4 border"
        side={isPrevious ? "right" : "left"}
        align="start"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label htmlFor={buttonLabelId} className="text-sm font-medium">
            Button label
          </Label>
          <Input
            id={buttonLabelId}
            value={inputValue}
            placeholder={placeholder}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => handleLabelChange(inputValue)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                saveAndClose();
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <PlateElement
      className={cn(
        "m-0 px-0 py-1",
        // Previous floats left, Submit on single-page floats left, otherwise floats right
        isPrevious || isSubmitOnSinglePage ? "float-left clear-none" : "float-right clear-none",
        className,
      )}
      {...props}
    >
      {/* Hidden children to maintain Slate structure */}
      <span className="hidden">{children}</span>
      {/* Non-editable button visual - onMouseDown prevents cursor placement */}
      <div
        className="inline-flex items-center gap-1 group"
        contentEditable={false}
        role="presentation"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Gear icon on left when button floats right (so button touches right edge) */}
        {!(isPrevious || isSubmitOnSinglePage) && GearIcon}
        <span
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-default select-none gap-2",
            isPrevious
              ? "border border-input bg-background shadow-xs text-foreground"
              : "bg-primary text-primary-foreground ",
          )}
        >
          {isPrevious && <ChevronLeft className="h-4 w-4" />}
          <span>{displayText}</span>
          {buttonRole === "next" && <ChevronRight className="h-4 w-4" />}
        </span>
        {/* Gear icon on right when button floats left (so button touches left edge) */}
        {(isPrevious || isSubmitOnSinglePage) && GearIcon}
      </div>
    </PlateElement>
  );
}
