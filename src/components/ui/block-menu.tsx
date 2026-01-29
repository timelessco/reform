import {
	BLOCK_CONTEXT_MENU_ID,
	BlockMenuPlugin,
	BlockSelectionPlugin,
} from "@platejs/selection/react";
import {
	ChevronRight,
	Copy,
	EyeOff,
	GripVertical,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { KEYS } from "platejs";
import {
	useEditorPlugin,
	useEditorSelector,
	useHotkeys,
	usePluginOption,
} from "platejs/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type BlockFieldType = "formInput" | "formButton" | "static" | "unknown";

// Get field type category for the menu
function getFieldType(nodeType: string | undefined): BlockFieldType {
	if (!nodeType) return "unknown";
	if (["formLabel", "formInput", "formTextarea"].includes(nodeType))
		return "formInput";
	if (nodeType === "formButton") return "formButton";
	if (["h1", "h2", "h3", "p", "blockquote", "hr"].includes(nodeType))
		return "static";
	return "unknown";
}

// Get label text from node
function extractLabelText(node: {
	children?: Array<{ text?: string }>;
}): string {
	if (!node.children) return "Untitled";
	return (
		node.children
			.map((child) => child.text || "")
			.join("")
			.trim() || "Untitled"
	);
}

export function BlockMenu({ children }: { children: React.ReactNode }) {
	const { api, editor } = useEditorPlugin(BlockMenuPlugin);
	const openId = usePluginOption(BlockMenuPlugin, "openId");
	const isOpen = openId === BLOCK_CONTEXT_MENU_ID;

	// Retrieve position from plugin options
	const position = usePluginOption(BlockMenuPlugin, "position");
	const { x, y } = position ?? { x: 0, y: 0 };

	const [isEditingName, setIsEditingName] = React.useState(false);
	const [fieldName, setFieldName] = React.useState("");
	const [showTurnInto, setShowTurnInto] = React.useState(false);
	const [buttonText, setButtonText] = React.useState("");

	// Get the selected node info
	// Get the selected node info reactive to editor state changes
	const selectedNodes = useEditorSelector(
		(editor) => {
			if (!isOpen) return [];
			try {
				return editor.getApi(BlockSelectionPlugin).blockSelection.getNodes();
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
		if (["formInput", "formTextarea"].includes(nodeType ?? "") && firstPath) {
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
		if (["formInput", "formTextarea"].includes(nodeType ?? ""))
			return firstNode;
		if (nodeType === "formLabel" && firstPath) {
			// Look at next sibling for input or textarea
			const nextPath = [...firstPath];
			nextPath[nextPath.length - 1] += 1;
			try {
				const next = editor.api.node(nextPath);
				if (
					next &&
					["formInput", "formTextarea"].includes(next[0]?.type as string)
				) {
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
		if (["formInput", "formTextarea"].includes(nodeType ?? ""))
			return firstPath;
		if (nodeType === "formLabel") {
			const inputPath = [...firstPath];
			inputPath[inputPath.length - 1] += 1;
			return inputPath;
		}
		return null;
	}, [nodeType, firstPath]);

	// Reset state when menu opens/closes
	React.useEffect(() => {
		if (isOpen) {
			const label = labelNode
				? extractLabelText(labelNode)
				: firstNode
					? extractLabelText(firstNode)
					: "Untitled";
			setFieldName(label);
			setIsEditingName(false);
			setShowTurnInto(false);
			// Initialize button text for formButton nodes
			if (nodeType === "formButton") {
				setButtonText((firstNode?.buttonText as string) || "Submit");
			}
		}
	}, [isOpen, labelNode, firstNode, nodeType]);

	// Handlers for form input options
	const handleToggleRequired = () => {
		if (!labelNode || !firstPath) return;
		// Find the label path
		const labelPath = nodeType === "formLabel" ? firstPath : [...firstPath];
		if (["formInput", "formTextarea"].includes(nodeType ?? "")) {
			labelPath[labelPath.length - 1] -= 1;
		}
		const currentRequired = Boolean(labelNode.required);
		editor.tf.setNodes({ required: !currentRequired }, { at: labelPath });
	};

	const handleToggleMinLength = () => {
		const inputPath = getInputPath();
		if (!inputPath) return;
		const hasMinLength = inputNode?.minLength !== undefined;
		if (hasMinLength) {
			editor.tf.unsetNodes(["minLength"], { at: inputPath });
		} else {
			editor.tf.setNodes({ minLength: 1 }, { at: inputPath });
		}
	};

	const handleUpdateMinLength = (value: number) => {
		const inputPath = getInputPath();
		if (!inputPath) return;
		editor.tf.setNodes({ minLength: value }, { at: inputPath });
	};

	const handleToggleMaxLength = () => {
		const inputPath = getInputPath();
		if (!inputPath) return;
		const hasMaxLength = inputNode?.maxLength !== undefined;
		if (hasMaxLength) {
			editor.tf.unsetNodes(["maxLength"], { at: inputPath });
		} else {
			editor.tf.setNodes({ maxLength: 100 }, { at: inputPath });
		}
	};

	const handleUpdateMaxLength = (value: number) => {
		const inputPath = getInputPath();
		if (!inputPath) return;
		editor.tf.setNodes({ maxLength: value }, { at: inputPath });
	};

	const handleToggleDefaultValue = () => {
		const inputPath = getInputPath();
		if (!inputPath) return;
		const hasDefault = inputNode?.defaultValue !== undefined;
		if (hasDefault) {
			editor.tf.unsetNodes(["defaultValue"], { at: inputPath });
		} else {
			editor.tf.setNodes({ defaultValue: "" }, { at: inputPath });
		}
	};

	const handleUpdateDefaultValue = (value: string) => {
		const inputPath = getInputPath();
		if (!inputPath) return;
		editor.tf.setNodes({ defaultValue: value }, { at: inputPath });
	};

	// Button-specific handlers
	const handleUpdateButtonText = (value: string) => {
		if (!firstPath || nodeType !== "formButton") return;
		setButtonText(value);

		// Update children to sync with the renderer in form-button-node.tsx
		editor.tf.insertNodes(
			{ text: value },
			{ at: [...firstPath, 0], select: false },
		);
		editor.tf.removeNodes({ at: [...firstPath, 1] });

		// Also keep buttonText property for backward compatibility
		editor.tf.setNodes({ buttonText: value }, { at: firstPath });
	};

	const handleUpdateFieldName = () => {
		if (!labelNode || !firstPath || !fieldName.trim()) return;
		const labelPath =
			nodeType === "formLabel" || nodeType === "formButton"
				? firstPath
				: [...firstPath];
		if (["formInput", "formTextarea"].includes(nodeType ?? "")) {
			labelPath[labelPath.length - 1] -= 1;
		}
		// Update the text content of the label
		editor.tf.insertNodes(
			{ text: fieldName.trim() },
			{ at: [...labelPath, 0], select: false },
		);
		editor.tf.removeNodes({ at: [...labelPath, 1] });
		setIsEditingName(false);
	};

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

	const handleTurnInto = (type: string) => {
		editor
			.getApi(BlockSelectionPlugin)
			.blockSelection.getNodes()
			.forEach(([node, path]) => {
				if (node[KEYS.listType]) {
					editor.tf.unsetNodes([KEYS.listType, "indent"], {
						at: path,
					});
				}
				editor.tf.toggleBlock(type, { at: path });
			});
		api.blockMenu.hide();
	};

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

	return (
		<>
			<div
				onContextMenu={(event) => {
					event.preventDefault();
					api.blockMenu.show(BLOCK_CONTEXT_MENU_ID, {
						x: event.clientX,
						y: event.clientY,
					});
				}}
			>
				{children}
			</div>

			<Popover
				open={isOpen}
				onOpenChange={(open) => !open && api.blockMenu.hide()}
			>
				<PopoverAnchor
					style={{
						position: "fixed",
						left: `${x}px`,
						top: `${y}px`,
						width: 1,
						height: 1,
						pointerEvents: "none",
					}}
				/>
				<PopoverContent className="p-0 w-72" align="start" sideOffset={5}>
					{showTurnInto ? (
						/* Turn Into Submenu */
						<div className="p-2">
							<button
								onClick={() => setShowTurnInto(false)}
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 px-2"
							>
								← Back
							</button>
							<div className="space-y-1">
								<MenuItem onClick={() => handleTurnInto(KEYS.p)}>
									Paragraph
								</MenuItem>
								<MenuItem onClick={() => handleTurnInto(KEYS.h1)}>
									Heading 1
								</MenuItem>
								<MenuItem onClick={() => handleTurnInto(KEYS.h2)}>
									Heading 2
								</MenuItem>
								<MenuItem onClick={() => handleTurnInto(KEYS.h3)}>
									Heading 3
								</MenuItem>
								<MenuItem onClick={() => handleTurnInto(KEYS.blockquote)}>
									Blockquote
								</MenuItem>
							</div>
						</div>
					) : (
						/* Main Menu */
						<div>
							{/* Field Name Header */}
							<div className="flex items-center gap-2 p-3 border-b">
								<GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
								{isEditingName ? (
									<Input
										value={fieldName}
										onChange={(e) => setFieldName(e.target.value)}
										onBlur={handleUpdateFieldName}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleUpdateFieldName();
											if (e.key === "Escape") setIsEditingName(false);
										}}
										className="h-7 text-sm flex-1"
										autoFocus
									/>
								) : (
									<span className="text-sm font-medium flex-1 truncate">
										{fieldName}
									</span>
								)}
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 shrink-0"
									onClick={() => setIsEditingName(!isEditingName)}
								>
									<Pencil className="h-3.5 w-3.5" />
								</Button>
							</div>

							{/* Field-Specific Options */}
							{fieldType === "formInput" && (
								<div className="p-3 space-y-3 border-b">
									<ToggleOption
										label="Required"
										checked={isRequired}
										onCheckedChange={handleToggleRequired}
									/>

									{/* Default Value Option */}
									<div className="space-y-2">
										<ToggleOption
											label="Default answer"
											checked={hasDefaultValue}
											onCheckedChange={handleToggleDefaultValue}
										/>
										{hasDefaultValue && (
											<Input
												value={currentDefaultValue || ""}
												onChange={(e) =>
													handleUpdateDefaultValue(e.target.value)
												}
												placeholder="Enter default value"
												className="h-8 text-sm"
											/>
										)}
									</div>

									{/* Min Characters Option */}
									<div className="space-y-2">
										<ToggleOption
											label="Min characters"
											checked={hasMinLength}
											onCheckedChange={handleToggleMinLength}
										/>
										{hasMinLength && (
											<Input
												type="number"
												min={1}
												value={currentMinLength || 1}
												onChange={(e) =>
													handleUpdateMinLength(Number(e.target.value))
												}
												placeholder="Min"
												className="h-8 text-sm"
											/>
										)}
									</div>

									{/* Max Characters Option */}
									<div className="space-y-2">
										<ToggleOption
											label="Max characters"
											checked={hasMaxLength}
											onCheckedChange={handleToggleMaxLength}
										/>
										{hasMaxLength && (
											<Input
												type="number"
												min={1}
												value={currentMaxLength || 100}
												onChange={(e) =>
													handleUpdateMaxLength(Number(e.target.value))
												}
												placeholder="Max"
												className="h-8 text-sm"
											/>
										)}
									</div>
								</div>
							)}

							{/* Button-Specific Options */}
							{fieldType === "formButton" && (
								<div className="p-3 space-y-3 border-b">
									<div className="space-y-2">
										<Label className="text-sm font-normal">Button Name</Label>
										<Input
											value={buttonText}
											onChange={(e) => handleUpdateButtonText(e.target.value)}
											placeholder="Enter button name"
											className="h-8 text-sm"
										/>
									</div>
								</div>
							)}

							{/* Common Actions */}
							<div className="p-2 space-y-1">
								<MenuItem onClick={handleDelete}>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete
									<span className="ml-auto text-xs text-muted-foreground">
										Del
									</span>
								</MenuItem>
								<MenuItem onClick={handleDuplicate}>
									<Copy className="h-4 w-4 mr-2" />
									Duplicate
									<span className="ml-auto text-xs text-muted-foreground">
										⌘D
									</span>
								</MenuItem>
								<MenuItem onClick={() => api.blockMenu.hide()}>
									<EyeOff className="h-4 w-4 mr-2" />
									Hide
									<span className="ml-auto text-xs text-muted-foreground">
										⌘⌥H
									</span>
								</MenuItem>
								<MenuItem onClick={() => api.blockMenu.hide()}>
									<Plus className="h-4 w-4 mr-2" />
									Add conditional logic
									<span className="ml-auto text-xs text-muted-foreground">
										⌘⌥L
									</span>
								</MenuItem>

								<Separator className="my-2" />

								<MenuItem onClick={() => setShowTurnInto(true)}>
									<span className="mr-2">↺</span>
									Turn into
									<ChevronRight className="h-4 w-4 ml-auto" />
								</MenuItem>
							</div>
						</div>
					)}
				</PopoverContent>
			</Popover>
		</>
	);
}

// Reusable Toggle Option component
function ToggleOption({
	label,
	checked,
	onCheckedChange,
}: {
	label: string;
	checked: boolean;
	onCheckedChange: () => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<Label className="text-sm font-normal">{label}</Label>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				className="scale-90"
			/>
		</div>
	);
}

// Reusable Menu Item component
function MenuItem({
	children,
	onClick,
	className,
}: {
	children: React.ReactNode;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
				className,
			)}
		>
			{children}
		</button>
	);
}
