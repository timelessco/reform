import {
  BLOCK_CONTEXT_MENU_ID,
  BlockMenuPlugin,
  BlockSelectionPlugin,
} from "@platejs/selection/react";
import { CopyIcon, EyeOffIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { KEYS } from "platejs";
import { useEditorPlugin, useEditorSelector, useHotkeys, usePluginOption } from "platejs/react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StyleNumberInput } from "@/components/ui/style-controls";
import { Switch } from "@/components/ui/switch";
import { useEditorTheme } from "@/contexts/editor-theme-context";
import { ALLOWED_LABEL_TYPES, FORM_INPUT_NODE_TYPES } from "@/lib/form-schema/form-field-constants";
import { cn } from "@/lib/utils";

type BlockFieldType =
  | "textLike" // formInput, formTextarea, formEmail, formPhone, formLink
  | "formNumber"
  | "formDate"
  | "formTime"
  | "formFileUpload"
  | "optionCheckbox" // formOptionItem variant="checkbox"
  | "optionMultiChoice" // formOptionItem variant="multiChoice"
  | "optionRanking" // formOptionItem variant="ranking"
  | "formMultiSelect" // formMultiSelectInput
  | "formButton"
  | "static"
  | "unknown";

const TEXT_LIKE_TYPES = new Set([
  "formInput",
  "formTextarea",
  "formEmail",
  "formPhone",
  "formLink",
]);

// Get field type category for the menu
const getFieldType = (node: { type?: string; variant?: string } | undefined): BlockFieldType => {
  if (!node?.type) return "unknown";
  const t = node.type;
  if (TEXT_LIKE_TYPES.has(t)) return "textLike";
  if (t === "formNumber") return "formNumber";
  if (t === "formDate") return "formDate";
  if (t === "formTime") return "formTime";
  if (t === "formFileUpload") return "formFileUpload";
  if (t === "formMultiSelectInput") return "formMultiSelect";
  if (t === "formOptionItem") {
    const v = node.variant || "checkbox";
    if (v === "multiChoice") return "optionMultiChoice";
    if (v === "ranking") return "optionRanking";
    return "optionCheckbox";
  }
  if (t === "formButton") return "formButton";
  if (["h1", "h2", "h3", "p", "blockquote", "hr"].includes(t)) return "static";
  return "unknown";
};

// Get label text from node
const extractLabelText = (node: { children?: Array<{ text?: string }> }): string => {
  if (!node.children) return "Untitled";
  return (
    node.children
      .map((child) => child.text || "")
      .join("")
      .trim() || "Untitled"
  );
};

export const BlockMenu = ({ children }: { children: React.ReactNode }) => {
  const { api, editor } = useEditorPlugin(BlockMenuPlugin);
  const openId = usePluginOption(BlockMenuPlugin, "openId");
  const { themeVars, hasCustomization } = useEditorTheme();
  const isOpen = openId === BLOCK_CONTEXT_MENU_ID;

  // Retrieve position from plugin options
  const position = usePluginOption(BlockMenuPlugin, "position");
  const { x, y } = position ?? { x: 0, y: 0 };

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [fieldName, setFieldName] = React.useState("");
  const [buttonText, setButtonText] = React.useState("");
  const [turnIntoOpen, setTurnIntoOpen] = React.useState(false);
  // Track previous open state to detect open transition
  const wasOpenRef = React.useRef(false);
  const blockMenuTriggerRef = React.useRef<HTMLDivElement | null>(null);
  const turnIntoCloseTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Get the selected node info reactive to editor state changes
  const selectedNodes = useEditorSelector(
    (ed) => {
      if (!isOpen) return [];
      try {
        return ed.getApi(BlockSelectionPlugin).blockSelection.getNodes();
      } catch {
        return [];
      }
    },
    [isOpen],
  );

  const firstNode = selectedNodes[0]?.[0] as
    | {
        type?: string;
        variant?: string;
        required?: boolean;
        placeholder?: string;
        minLength?: number;
        maxLength?: number;
        defaultValue?: string;
        buttonText?: string;
        children?: Array<{ text?: string }>;
        minValue?: number;
        maxValue?: number;
        allowDecimals?: boolean;
        maxFileSize?: number;
        maxFiles?: number;
        allowedFileTypes?: string;
        minSelections?: number;
        maxSelections?: number;
        randomizeOrder?: boolean;
        allowOther?: boolean;
      }
    | undefined;
  const firstPath = selectedNodes[0]?.[1];

  const nodeType = firstNode?.type;

  // Get label node (for formInput/formTextarea, look at previous sibling)
  const labelNode = React.useMemo(() => {
    if (nodeType === "formLabel" || nodeType === "formButton") return firstNode;
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "") && firstPath) {
      // Look at previous sibling for label
      const prevPath = [...firstPath];
      prevPath[prevPath.length - 1] -= 1;
      try {
        const prev = editor.api.node(prevPath);
        if (prev && ALLOWED_LABEL_TYPES.has(prev[0]?.type as string)) {
          return prev[0] as typeof firstNode;
        }
      } catch {
        // No previous sibling
      }
    }
    return null;
  }, [nodeType, firstNode, firstPath, editor]);

  // Get input node (for formLabel, look at next sibling)
  const inputNode = React.useMemo(() => {
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "")) return firstNode;
    if (ALLOWED_LABEL_TYPES.has(nodeType ?? "") && firstPath) {
      // Look at next sibling for input or textarea
      const nextPath = [...firstPath];
      nextPath[nextPath.length - 1] += 1;
      try {
        const next = editor.api.node(nextPath);
        if (next && FORM_INPUT_NODE_TYPES.has(next[0]?.type as string)) {
          return next[0] as typeof firstNode;
        }
      } catch {
        // No next sibling
      }
    }
    return null;
  }, [nodeType, firstNode, firstPath, editor]);

  // Resolve field type from inputNode when available (e.g., when clicking a label)
  const fieldType = React.useMemo(() => {
    if (inputNode) return getFieldType(inputNode as { type?: string; variant?: string });
    return getFieldType(firstNode as { type?: string; variant?: string });
  }, [inputNode, firstNode]);

  // Helper to get the input path
  const getInputPath = React.useCallback(() => {
    if (!firstPath) return null;
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "")) return firstPath;
    if (nodeType === "formOptionItem") return firstPath;
    if (ALLOWED_LABEL_TYPES.has(nodeType ?? "")) {
      const inputPath = [...firstPath];
      inputPath[inputPath.length - 1] += 1;
      return inputPath;
    }
    return null;
  }, [nodeType, firstPath]);

  // Initialize state only when menu transitions to open (not on every node change)
  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const label = labelNode
        ? extractLabelText(labelNode)
        : firstNode
          ? extractLabelText(firstNode)
          : "Untitled";
      setFieldName(label);
      setIsEditingName(false);
      setTurnIntoOpen(false);
      if (nodeType === "formButton") {
        setButtonText((firstNode?.buttonText as string) || "Submit");
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, labelNode, firstNode, nodeType]);

  // Handlers for form input options
  const handleToggleRequired = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const currentRequired = Boolean(inputNode?.required);
    editor.tf.setNodes({ required: !currentRequired }, { at: inputPath });
  }, [getInputPath, inputNode?.required, editor.tf]);

  const handleUpdateMinLength = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["minLength"], { at: inputPath });
      } else {
        editor.tf.setNodes({ minLength: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateMaxLength = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["maxLength"], { at: inputPath });
      } else {
        editor.tf.setNodes({ maxLength: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateMinValue = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["minValue"], { at: inputPath });
      } else {
        editor.tf.setNodes({ minValue: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateMaxValue = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["maxValue"], { at: inputPath });
      } else {
        editor.tf.setNodes({ maxValue: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleToggleAllowDecimals = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const current = Boolean(inputNode?.allowDecimals);
    if (current) {
      editor.tf.unsetNodes(["allowDecimals"], { at: inputPath });
    } else {
      editor.tf.setNodes({ allowDecimals: true }, { at: inputPath });
    }
  }, [getInputPath, inputNode?.allowDecimals, editor.tf]);

  const handleUpdateMaxFileSize = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 10;
      editor.tf.setNodes({ maxFileSize: num }, { at: inputPath });
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateMaxFiles = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["maxFiles"], { at: inputPath });
      } else {
        editor.tf.setNodes({ maxFiles: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateAllowedFileTypes = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      editor.tf.setNodes({ allowedFileTypes: value }, { at: inputPath });
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateMinSelections = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["minSelections"], { at: inputPath });
      } else {
        editor.tf.setNodes({ minSelections: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleUpdateMaxSelections = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      const num = parseInt(value, 10) || 0;
      if (num === 0) {
        editor.tf.unsetNodes(["maxSelections"], { at: inputPath });
      } else {
        editor.tf.setNodes({ maxSelections: num }, { at: inputPath });
      }
    },
    [getInputPath, editor.tf],
  );

  const handleToggleRandomizeOrder = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const current = Boolean(inputNode?.randomizeOrder);
    if (current) {
      editor.tf.unsetNodes(["randomizeOrder"], { at: inputPath });
    } else {
      editor.tf.setNodes({ randomizeOrder: true }, { at: inputPath });
    }
  }, [getInputPath, inputNode?.randomizeOrder, editor.tf]);

  const handleToggleAllowOther = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const current = Boolean(inputNode?.allowOther);
    if (current) {
      editor.tf.unsetNodes(["allowOther"], { at: inputPath });
    } else {
      editor.tf.setNodes({ allowOther: true }, { at: inputPath });
    }
  }, [getInputPath, inputNode?.allowOther, editor.tf]);

  const handleToggleDefaultValue = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const hasDefault = inputNode?.defaultValue !== undefined;
    if (hasDefault) {
      editor.tf.unsetNodes(["defaultValue"], { at: inputPath });
    } else {
      editor.tf.setNodes({ defaultValue: "" }, { at: inputPath });
    }
  }, [getInputPath, inputNode?.defaultValue, editor.tf]);

  const handleUpdateDefaultValue = React.useCallback(
    (value: string) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      editor.tf.setNodes({ defaultValue: value }, { at: inputPath });
    },
    [getInputPath, editor.tf],
  );

  // Button-specific handlers
  const handleUpdateButtonText = React.useCallback(
    (value: string) => {
      if (!firstPath || nodeType !== "formButton") return;
      setButtonText(value);

      editor.tf.withoutNormalizing(() => {
        editor.tf.insertNodes({ text: value }, { at: [...firstPath, 0], select: false });
        editor.tf.removeNodes({ at: [...firstPath, 1] });
      });

      editor.tf.setNodes({ buttonText: value }, { at: firstPath });
    },
    [firstPath, nodeType, editor.tf],
  );

  // Common actions
  const handleDelete = React.useCallback(() => {
    editor.getTransforms(BlockSelectionPlugin).blockSelection.removeNodes();
    editor.tf.focus();
    api.blockMenu.hide();
  }, [editor, api.blockMenu]);

  const handleDuplicate = React.useCallback(() => {
    editor.getTransforms(BlockSelectionPlugin).blockSelection.duplicate();
    api.blockMenu.hide();
  }, [editor, api.blockMenu]);

  const handleTurnInto = React.useCallback(
    (type: string) => {
      editor
        .getApi(BlockSelectionPlugin)
        .blockSelection.getNodes()
        .forEach(([node, path]: [Record<string, unknown>, number[]]) => {
          if (node[KEYS.listType]) {
            editor.tf.unsetNodes([KEYS.listType, "indent"], {
              at: path,
            });
          }
          editor.tf.toggleBlock(type, { at: path });
        });
      api.blockMenu.hide();
    },
    [editor, api.blockMenu],
  );

  React.useEffect(() => {
    const node = blockMenuTriggerRef.current;
    if (!node) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      api.blockMenu.show(BLOCK_CONTEXT_MENU_ID, {
        x: event.clientX,
        y: event.clientY,
      });
    };

    node.addEventListener("contextmenu", handleContextMenu);
    return () => {
      node.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [api.blockMenu]);

  // Keyboard shortcuts
  // Delete: Del or Backspace
  useHotkeys(
    "delete, backspace",
    handleDelete,
    { enabled: isOpen && !isEditingName, preventDefault: true },
    [isOpen, isEditingName, handleDelete],
  );

  // Duplicate: Cmd+D
  useHotkeys(
    "mod+d",
    handleDuplicate,
    { enabled: isOpen && !isEditingName, preventDefault: true },
    [isOpen, isEditingName, handleDuplicate],
  );

  // Hide: Cmd+Opt+H
  useHotkeys(
    "mod+alt+h",
    () => api.blockMenu.hide(),
    { enabled: isOpen && !isEditingName, preventDefault: true },
    [isOpen, isEditingName, api.blockMenu],
  );

  // Add conditional logic: Cmd+Opt+L
  useHotkeys(
    "mod+alt+l",
    () => api.blockMenu.hide(),
    { enabled: isOpen && !isEditingName, preventDefault: true },
    [isOpen, isEditingName, api.blockMenu],
  );

  // Get current node properties
  const isRequired = Boolean(inputNode?.required);
  const hasDefaultValue = inputNode?.defaultValue !== undefined;
  const currentDefaultValue = inputNode?.defaultValue;

  const handleOpenChange = React.useCallback(
    (open: boolean, eventDetails: { reason?: string }) => {
      if (!open) {
        const { reason } = eventDetails;
        // Only close on deliberate dismissals, not focus-related events
        // that fire during submenu interactions
        if (reason === "outsidePress" || reason === "escapeKey" || reason === "itemPress") {
          api.blockMenu.hide();
        }
      }
    },
    [api.blockMenu],
  );

  const handleTurnIntoParagraph = React.useCallback(() => handleTurnInto(KEYS.p), [handleTurnInto]);
  const handleTurnIntoH1 = React.useCallback(() => handleTurnInto(KEYS.h1), [handleTurnInto]);
  const handleTurnIntoH2 = React.useCallback(() => handleTurnInto(KEYS.h2), [handleTurnInto]);
  const handleTurnIntoH3 = React.useCallback(() => handleTurnInto(KEYS.h3), [handleTurnInto]);
  const handleTurnIntoBlockquote = React.useCallback(
    () => handleTurnInto(KEYS.blockquote),
    [handleTurnInto],
  );

  const handleStopPropagation = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleDefaultValueChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpdateDefaultValue(e.target.value),
    [handleUpdateDefaultValue],
  );

  const handleButtonTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpdateButtonText(e.target.value),
    [handleUpdateButtonText],
  );

  const handleHideMenu = React.useCallback(() => {
    api.blockMenu.hide();
  }, [api.blockMenu]);

  // Submenu hover handlers — manually bridge trigger ↔ submenu content
  const handleTurnIntoPointerEnter = React.useCallback(() => {
    clearTimeout(turnIntoCloseTimer.current);
    setTurnIntoOpen(true);
  }, []);

  const handleTurnIntoPointerLeave = React.useCallback(() => {
    turnIntoCloseTimer.current = setTimeout(() => setTurnIntoOpen(false), 150);
  }, []);

  // Virtual anchor for positioning the menu at the click coordinates
  const virtualAnchor = React.useMemo(() => {
    if (!isOpen) return undefined;
    return {
      getBoundingClientRect: () => ({
        x,
        y,
        width: 0,
        height: 0,
        top: y,
        left: x,
        right: x,
        bottom: y,
        toJSON: () => ({}),
      }),
    };
  }, [isOpen, x, y]);

  return (
    <>
      <div ref={blockMenuTriggerRef}>{children}</div>

      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange} modal={false}>
        <DropdownMenuContent
          anchor={virtualAnchor}
          className={cn("w-[288px] p-1", hasCustomization && "bf-themed")}
          style={hasCustomization ? themeVars : undefined}
          align="start"
          sideOffset={8}
        >
          {/* Field Name Header */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-[13px] flex-1 truncate text-foreground">{fieldName}</span>
          </div>
          <DropdownMenuSeparator />

          {/* Universal Required switch for all form field types */}
          {fieldType !== "static" && fieldType !== "formButton" && fieldType !== "unknown" && (
            <DropdownMenuItem closeOnClick={false} onClick={handleToggleRequired}>
              <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                Required
              </span>
              <Switch
                aria-label="Required"
                size="sm"
                checked={isRequired}
                onCheckedChange={handleToggleRequired}
                onClick={handleStopPropagation}
              />
            </DropdownMenuItem>
          )}

          {/* Text-like field options */}
          {fieldType === "textLike" && (
            <>
              <DropdownMenuItem closeOnClick={false} onClick={handleToggleDefaultValue}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Default answer
                </span>
                <Switch
                  aria-label="Default answer"
                  size="sm"
                  checked={hasDefaultValue}
                  onCheckedChange={handleToggleDefaultValue}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              {hasDefaultValue && (
                <div className="px-2 pb-2">
                  <Input
                    value={currentDefaultValue || ""}
                    onChange={handleDefaultValueChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Enter default value"
                    className="h-7 text-[13px] rounded-lg"
                    aria-label="Default value"
                  />
                </div>
              )}

              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Min characters"
                  value={String(inputNode?.minLength ?? 0)}
                  onChange={handleUpdateMinLength}
                  min={0}
                  max={1000}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>

              {inputNode?.type !== "formTextarea" && (
                <div onPointerDown={handleStopPropagation}>
                  <StyleNumberInput
                    label="Max characters"
                    value={String(inputNode?.maxLength ?? 0)}
                    onChange={handleUpdateMaxLength}
                    min={0}
                    max={1000}
                    step={1}
                    unit=""
                    displayUnit=""
                    className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                  />
                </div>
              )}

              <DropdownMenuSeparator />
            </>
          )}

          {/* Number field options */}
          {fieldType === "formNumber" && (
            <>
              <DropdownMenuItem closeOnClick={false} onClick={handleToggleDefaultValue}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Default answer
                </span>
                <Switch
                  aria-label="Default answer"
                  size="sm"
                  checked={hasDefaultValue}
                  onCheckedChange={handleToggleDefaultValue}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              {hasDefaultValue && (
                <div className="px-2 pb-2">
                  <Input
                    type="number"
                    value={currentDefaultValue || ""}
                    onChange={handleDefaultValueChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Enter default value"
                    className="h-7 text-[13px] rounded-lg"
                    aria-label="Default value"
                  />
                </div>
              )}

              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Min value"
                  value={String(inputNode?.minValue ?? 0)}
                  onChange={handleUpdateMinValue}
                  min={0}
                  max={999999}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>

              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Max value"
                  value={String(inputNode?.maxValue ?? 0)}
                  onChange={handleUpdateMaxValue}
                  min={0}
                  max={999999}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>

              <DropdownMenuItem closeOnClick={false} onClick={handleToggleAllowDecimals}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Allow decimals
                </span>
                <Switch
                  aria-label="Allow decimals"
                  size="sm"
                  checked={Boolean(inputNode?.allowDecimals)}
                  onCheckedChange={handleToggleAllowDecimals}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          {/* File upload options */}
          {fieldType === "formFileUpload" && (
            <>
              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Max file size"
                  value={`${inputNode?.maxFileSize ?? 10}MB`}
                  onChange={handleUpdateMaxFileSize}
                  min={1}
                  max={50}
                  step={1}
                  unit="MB"
                  displayUnit="MB"
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>

              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Max files"
                  value={String(inputNode?.maxFiles ?? 0)}
                  onChange={handleUpdateMaxFiles}
                  min={0}
                  max={20}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>

              <DropdownMenuItem closeOnClick={false}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  File types
                </span>
                <Select
                  value={(inputNode?.allowedFileTypes as string) ?? "all"}
                  onValueChange={(v) => v && handleUpdateAllowedFileTypes(v)}
                >
                  <SelectTrigger className="h-6 w-[100px] text-[12px] rounded-md border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All files</SelectItem>
                    <SelectItem value="images">Images</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                  </SelectContent>
                </Select>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          {/* Checkbox options */}
          {fieldType === "optionCheckbox" && (
            <>
              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Min selections"
                  value={String(inputNode?.minSelections ?? 0)}
                  onChange={handleUpdateMinSelections}
                  min={0}
                  max={50}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>
              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Max selections"
                  value={String(inputNode?.maxSelections ?? 0)}
                  onChange={handleUpdateMaxSelections}
                  min={0}
                  max={50}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>
              <DropdownMenuItem closeOnClick={false} onClick={handleToggleRandomizeOrder}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Randomize order
                </span>
                <Switch
                  aria-label="Randomize order"
                  size="sm"
                  checked={Boolean(inputNode?.randomizeOrder)}
                  onCheckedChange={handleToggleRandomizeOrder}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick={false} onClick={handleToggleAllowOther}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  &quot;Other&quot; option
                </span>
                <Switch
                  aria-label="Other option"
                  size="sm"
                  checked={Boolean(inputNode?.allowOther)}
                  onCheckedChange={handleToggleAllowOther}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Multi Select badge options */}
          {fieldType === "formMultiSelect" && (
            <>
              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Min selections"
                  value={String(inputNode?.minSelections ?? 0)}
                  onChange={handleUpdateMinSelections}
                  min={0}
                  max={50}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>
              <div onPointerDown={handleStopPropagation}>
                <StyleNumberInput
                  label="Max selections"
                  value={String(inputNode?.maxSelections ?? 0)}
                  onChange={handleUpdateMaxSelections}
                  min={0}
                  max={50}
                  step={1}
                  unit=""
                  displayUnit=""
                  className="!border-0 !bg-transparent hover:!bg-accent !h-[26px] !text-sm !rounded-lg !px-2 text-foreground/80 hover:text-accent-foreground"
                />
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Multi-choice (radio) options */}
          {fieldType === "optionMultiChoice" && (
            <>
              <DropdownMenuItem closeOnClick={false} onClick={handleToggleRandomizeOrder}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Randomize order
                </span>
                <Switch
                  aria-label="Randomize order"
                  size="sm"
                  checked={Boolean(inputNode?.randomizeOrder)}
                  onCheckedChange={handleToggleRandomizeOrder}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick={false} onClick={handleToggleAllowOther}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  &quot;Other&quot; option
                </span>
                <Switch
                  aria-label="Other option"
                  size="sm"
                  checked={Boolean(inputNode?.allowOther)}
                  onCheckedChange={handleToggleAllowOther}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Ranking - only Required (handled above) */}
          {fieldType === "optionRanking" && <DropdownMenuSeparator />}

          {/* Date/Time fields only get Required (handled above) + separator */}
          {(fieldType === "formDate" || fieldType === "formTime") && <DropdownMenuSeparator />}

          {/* Button-Specific Options */}
          {fieldType === "formButton" && (
            <>
              <div className="px-2 py-1.5 space-y-2">
                <Label className="text-[12px] text-muted-foreground">Button Name</Label>
                <Input
                  value={buttonText}
                  onChange={handleButtonTextChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Enter button name"
                  className="h-8 text-[13px] rounded-lg"
                />
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Common Actions */}
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <TrashIcon />
            <span className="flex-1 text-left">Delete</span>
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-foreground/80" onClick={handleDuplicate}>
            <CopyIcon />
            <span className="flex-1 text-left">Duplicate</span>
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-foreground/80" onClick={handleHideMenu}>
            <EyeOffIcon />
            <span className="flex-1 text-left">Hide</span>
            <DropdownMenuShortcut>⌘⌥H</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-foreground/80" onClick={handleHideMenu}>
            <PlusIcon />
            <span className="flex-1 text-left">Add conditional logic</span>
            <DropdownMenuShortcut>⌘⌥L</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Turn Into Submenu */}
          <DropdownMenuSub open={turnIntoOpen}>
            <DropdownMenuSubTrigger
              className="text-foreground/80"
              onPointerEnter={handleTurnIntoPointerEnter}
              onPointerLeave={handleTurnIntoPointerLeave}
            >
              <span className="text-[13px]">↺</span>
              <span className="flex-1 text-left">Turn into</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent
              onPointerEnter={handleTurnIntoPointerEnter}
              onPointerLeave={handleTurnIntoPointerLeave}
            >
              <DropdownMenuItem onClick={handleTurnIntoParagraph}>Paragraph</DropdownMenuItem>
              <DropdownMenuItem onClick={handleTurnIntoH1}>Heading 1</DropdownMenuItem>
              <DropdownMenuItem onClick={handleTurnIntoH2}>Heading 2</DropdownMenuItem>
              <DropdownMenuItem onClick={handleTurnIntoH3}>Heading 3</DropdownMenuItem>
              <DropdownMenuItem onClick={handleTurnIntoBlockquote}>Blockquote</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
