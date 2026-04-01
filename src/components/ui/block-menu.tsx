import {
  BLOCK_CONTEXT_MENU_ID,
  BlockMenuPlugin,
  BlockSelectionPlugin,
} from "@platejs/selection/react";
import {
  CopyIcon,
  EyeOffIcon,
  GripVerticalIcon,
  Pencil2Icon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { KEYS } from "platejs";
import { useEditorPlugin, useEditorSelector, useHotkeys, usePluginOption } from "platejs/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useEditorTheme } from "@/contexts/editor-theme-context";
import { cn } from "@/lib/utils";

type BlockFieldType = "formInput" | "formButton" | "static" | "unknown";

const FORM_INPUT_NODE_TYPES = new Set([
  "formInput",
  "formTextarea",
  "formEmail",
  "formPhone",
  "formNumber",
  "formLink",
  "formDate",
  "formTime",
  "formFileUpload",
]);

// Get field type category for the menu
const getFieldType = (nodeType: string | undefined): BlockFieldType => {
  if (!nodeType) return "unknown";
  if (nodeType === "formLabel" || FORM_INPUT_NODE_TYPES.has(nodeType)) return "formInput";
  if (nodeType === "formButton") return "formButton";
  if (["h1", "h2", "h3", "p", "blockquote", "hr"].includes(nodeType)) return "static";
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
  const turnIntoCloseTimer = React.useRef<ReturnType<typeof setTimeout>>();

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
        required?: boolean;
        placeholder?: string;
        minLength?: number;
        maxLength?: number;
        defaultValue?: string;
        buttonText?: string;
        children?: Array<{ text?: string }>;
      }
    | undefined;
  const firstPath = selectedNodes[0]?.[1];

  const nodeType = firstNode?.type;
  const fieldType = getFieldType(nodeType);

  // Get label node (for formInput/formTextarea, look at previous sibling)
  const labelNode = React.useMemo(() => {
    if (nodeType === "formLabel" || nodeType === "formButton") return firstNode;
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "") && firstPath) {
      // Look at previous sibling for label
      const prevPath = [...firstPath];
      prevPath[prevPath.length - 1] -= 1;
      try {
        const prev = editor.api.node(prevPath);
        if (prev && prev[0]?.type === "formLabel") {
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
    if (nodeType === "formLabel" && firstPath) {
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

  // Helper to get the input path
  const getInputPath = React.useCallback(() => {
    if (!firstPath) return null;
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "")) return firstPath;
    if (nodeType === "formLabel") {
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
    if (!labelNode || !firstPath) return;
    const labelPath = nodeType === "formLabel" ? firstPath : [...firstPath];
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "")) {
      labelPath[labelPath.length - 1] -= 1;
    }
    const currentRequired = Boolean(labelNode.required);
    editor.tf.setNodes({ required: !currentRequired }, { at: labelPath });
  }, [labelNode, firstPath, nodeType, editor.tf]);

  const handleToggleMinLength = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const hasMinLength = inputNode?.minLength !== undefined;
    if (hasMinLength) {
      editor.tf.unsetNodes(["minLength"], { at: inputPath });
    } else {
      editor.tf.setNodes({ minLength: 1 }, { at: inputPath });
    }
  }, [getInputPath, inputNode?.minLength, editor.tf]);

  const handleUpdateMinLength = React.useCallback(
    (value: number) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      editor.tf.setNodes({ minLength: value }, { at: inputPath });
    },
    [getInputPath, editor.tf],
  );

  const handleToggleMaxLength = React.useCallback(() => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const hasMaxLength = inputNode?.maxLength !== undefined;
    if (hasMaxLength) {
      editor.tf.unsetNodes(["maxLength"], { at: inputPath });
    } else {
      editor.tf.setNodes({ maxLength: 100 }, { at: inputPath });
    }
  }, [getInputPath, inputNode?.maxLength, editor.tf]);

  const handleUpdateMaxLength = React.useCallback(
    (value: number) => {
      const inputPath = getInputPath();
      if (!inputPath) return;
      editor.tf.setNodes({ maxLength: value }, { at: inputPath });
    },
    [getInputPath, editor.tf],
  );

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

  const handleUpdateFieldName = React.useCallback(() => {
    if (!labelNode || !firstPath || !fieldName.trim()) return;
    const labelPath =
      nodeType === "formLabel" || nodeType === "formButton" ? firstPath : [...firstPath];
    if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "")) {
      labelPath[labelPath.length - 1] -= 1;
    }
    editor.tf.withoutNormalizing(() => {
      editor.tf.insertNodes({ text: fieldName.trim() }, { at: [...labelPath, 0], select: false });
      editor.tf.removeNodes({ at: [...labelPath, 1] });
    });
    setIsEditingName(false);
  }, [labelNode, firstPath, fieldName, nodeType, editor.tf]);

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
  const isRequired = Boolean(labelNode?.required);
  const hasMinLength = inputNode?.minLength !== undefined;
  const hasMaxLength = inputNode?.maxLength !== undefined;
  const hasDefaultValue = inputNode?.defaultValue !== undefined;
  const currentMinLength = inputNode?.minLength;
  const currentMaxLength = inputNode?.maxLength;
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

  const handleFieldNameChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFieldName(e.target.value),
    [],
  );

  const handleFieldNameKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") handleUpdateFieldName();
      if (e.key === "Escape") setIsEditingName(false);
    },
    [handleUpdateFieldName],
  );

  const handleToggleEditName = React.useCallback(
    () => setIsEditingName(!isEditingName),
    [isEditingName],
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

  const handleMinLengthChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpdateMinLength(Number(e.target.value)),
    [handleUpdateMinLength],
  );

  const handleMaxLengthChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpdateMaxLength(Number(e.target.value)),
    [handleUpdateMaxLength],
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

          {/* Field-Specific Options */}
          {fieldType === "formInput" && (
            <>
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

              <DropdownMenuItem closeOnClick={false} onClick={handleToggleMinLength}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Min characters
                </span>
                <Switch
                  aria-label="Min characters"
                  size="sm"
                  checked={hasMinLength}
                  onCheckedChange={handleToggleMinLength}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              {hasMinLength && (
                <div className="px-2 pb-2">
                  <Input
                    type="number"
                    min={1}
                    value={currentMinLength || 1}
                    onChange={handleMinLengthChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Min"
                    className="h-7 text-[13px] rounded-lg"
                    aria-label="Minimum length"
                  />
                </div>
              )}

              <DropdownMenuItem closeOnClick={false} onClick={handleToggleMaxLength}>
                <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
                  Max characters
                </span>
                <Switch
                  aria-label="Max characters"
                  size="sm"
                  checked={hasMaxLength}
                  onCheckedChange={handleToggleMaxLength}
                  onClick={handleStopPropagation}
                />
              </DropdownMenuItem>
              {hasMaxLength && (
                <div className="px-2 pb-2">
                  <Input
                    type="number"
                    min={1}
                    value={currentMaxLength || 100}
                    onChange={handleMaxLengthChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Max"
                    className="h-7 text-[13px] rounded-lg"
                    aria-label="Maximum length"
                  />
                </div>
              )}

              <DropdownMenuSeparator />
            </>
          )}

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
