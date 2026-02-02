import { type Path, PathApi, type TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import { createPlatePlugin } from "platejs/react";
import { FormButtonElement } from "@/components/ui/form-button-node";
import { FormInputElement } from "@/components/ui/form-input-node";
import { FormLabelElement } from "@/components/ui/form-label-node";
import { FormTextareaElement } from "@/components/ui/form-textarea-node";
import { PageBreakElement } from "@/components/ui/page-break-node";

const FORM_FIELD_TYPES = [
	"formInput",
	"formTextarea",
	"formButton",
	"formLabel",
	"pageBreak",
];

// Button types that should not be deleted
const PROTECTED_BUTTON_TYPES = ["formButton"];

function moveToPath(editor: PlateEditor, path: Path): boolean {
	const node = editor.api.node(path);
	if (node) {
		editor.tf.select({ path: [...path, 0], offset: 0 });
		return true;
	}
	return false;
}

/**
 * Find the next block after the given path, skipping form buttons and page breaks.
 * - If next is a "submit" button (last page), return null (stay in place)
 * - If next is a "next/previous" button, skip to first element after page break
 */
function findNextNonButtonPath(
	editor: PlateEditor,
	currentPath: Path,
): Path | null {
	const children = editor.children as TElement[];
	const currentIndex = currentPath[0];

	for (let i = currentIndex + 1; i < children.length; i++) {
		const node = children[i];
		if (!node) continue;

		// If we hit a form button, check its role
		if (node.type === "formButton") {
			const buttonRole = (node as any).buttonRole || "submit";

			// If it's a submit button, check if there's a thank you page after it
			if (buttonRole === "submit") {
				// Look ahead for a pageBreak with isThankYouPage: true
				let hasThankYouPage = false;
				for (let j = i + 1; j < children.length; j++) {
					const nextNode = children[j];
					if (
						nextNode.type === "pageBreak" &&
						(nextNode as any).isThankYouPage
					) {
						hasThankYouPage = true;
						break;
					}
				}
				// If no thank you page, stop navigation here
				if (!hasThankYouPage) {
					return null;
				}
				// Otherwise continue to find content after the thank you pageBreak
				continue;
			}

			// If it's a next/previous button, continue looking for content after page break
			continue;
		}

		// Skip page breaks - continue to find first content block after it
		if (node.type === "pageBreak") {
			continue;
		}

		// Skip form header (shouldn't navigate into it)
		if (node.type === "formHeader") {
			continue;
		}

		return [i];
	}

	return null;
}

/**
 * Find the previous block before the given path, skipping form buttons, page breaks, and headers.
 */
function findPrevNonButtonPath(
	editor: PlateEditor,
	currentPath: Path,
): Path | null {
	const children = editor.children as TElement[];
	const currentIndex = currentPath[0];

	for (let i = currentIndex - 1; i >= 0; i--) {
		const node = children[i];
		if (!node) continue;

		// Skip form buttons
		if (node.type === "formButton") continue;

		// Skip page breaks
		if (node.type === "pageBreak") continue;

		// Skip form header
		if (node.type === "formHeader") continue;

		return [i];
	}

	return null;
}

function handleFormBlockKeyDown(
	editor: PlateEditor,
	event: React.KeyboardEvent,
): void {
	// [TAB DEBUG] - remove after fix verified
	if (event.key === "Tab") {
		console.log(
			"[TAB DEBUG] handleFormBlockKeyDown entry, block:",
			editor.api.block()?.[0]?.type,
		);
	}

	// Prevent double-handling when multiple form plugins process same event
	if ((event as any).__formBlockHandled) return;

	const block = editor.api.block();
	if (!block || !FORM_FIELD_TYPES.includes(block[0].type)) return;

	// Mark as handled before any action
	(event as any).__formBlockHandled = true;

	const [node, path] = block;

	// Tab or ArrowDown → move to next sibling block (skip buttons)
	if ((event.key === "Tab" && !event.shiftKey) || event.key === "ArrowDown") {
		const nextPath = findNextNonButtonPath(editor, path);
		if (nextPath) {
			event.preventDefault();
			event.stopPropagation();
			event.nativeEvent.stopImmediatePropagation();
			moveToPath(editor, nextPath);
		} else {
			// No next block - create new p block before submit button
			event.preventDefault();
			event.stopPropagation();
			event.nativeEvent.stopImmediatePropagation();

			// Find insert position (before first formButton or at end)
			const children = editor.children as TElement[];
			let insertIndex = children.length;
			for (let i = path[0] + 1; i < children.length; i++) {
				if (children[i].type === "formButton") {
					insertIndex = i;
					break;
				}
			}

			// Insert new paragraph and move to it
			const insertPath: Path = [insertIndex];
			editor.tf.insertNodes(
				{ type: "p", children: [{ text: "" }] } as TElement,
				{ at: insertPath },
			);
			moveToPath(editor, insertPath);
		}
		return;
	}

	// Shift+Tab or ArrowUp → move to previous sibling block (skip buttons)
	if ((event.key === "Tab" && event.shiftKey) || event.key === "ArrowUp") {
		const prevPath = findPrevNonButtonPath(editor, path);
		if (prevPath) {
			event.preventDefault();
			event.stopPropagation();
			event.nativeEvent.stopImmediatePropagation();
			moveToPath(editor, prevPath);
		}
		return;
	}

	// ArrowLeft at start of block → check if previous is a form button, block if so
	if (event.key === "ArrowLeft") {
		const children = editor.children as TElement[];
		const prevIndex = path[0] - 1;
		const prevNode = children[prevIndex];

		// Check if cursor is at the start of the block
		const selection = editor.selection;
		if (selection) {
			const edges = editor.api.edges(path);
			const start = edges?.[0];
			if (
				start &&
				selection.anchor.offset === start.offset &&
				PathApi.equals(selection.anchor.path, start.path)
			) {
				// Cursor is at start of block - check previous block
				if (
					prevNode &&
					(prevNode.type === "formButton" || prevNode.type === "pageBreak")
				) {
					// Block left arrow from entering button/pagebreak
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}
		}
	}

	// Enter → create new paragraph (position depends on cursor location)
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();

		const isEmpty = editor.api.isEmpty(node);
		const selection = editor.selection;
		const edges = editor.api.edges(path);

		// Check if cursor is at the START of the block
		const isAtStart =
			selection &&
			edges?.[0] &&
			PathApi.equals(selection.anchor.path, edges[0].path) &&
			selection.anchor.offset === edges[0].offset;

		// If at START with content → insert paragraph ABOVE (push form field down)
		if (!isEmpty && isAtStart) {
			editor.tf.insertNodes(
				{ type: "p", children: [{ text: "" }] } as TElement,
				{ at: path },
			);
			// Cursor stays in new paragraph (now at original path)
			moveToPath(editor, path);
			return;
		}

		// Otherwise → insert paragraph BELOW (original behavior)
		const nextPath = PathApi.next(path);
		const children = editor.children as TElement[];
		const nextIndex = nextPath[0];
		const nextNode = children[nextIndex];

		// If next block is a form button, insert BEFORE the button (at current position + 1)
		// This keeps the button at the end
		if (
			nextNode &&
			(nextNode.type === "formButton" || nextNode.type === "pageBreak")
		) {
			editor.tf.insertNodes(
				{ type: "p", children: [{ text: "" }] } as TElement,
				{
					at: nextPath,
				},
			);
			moveToPath(editor, nextPath);
			return;
		}

		editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as TElement, {
			at: nextPath,
		});
		moveToPath(editor, nextPath);
		return;
	}

	// Shift+Enter → insert newline in current block
	if (event.key === "Enter" && event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();
		editor.tf.insertNodes({ text: "\n" });
		return;
	}

	// Backspace on empty → delete current block (but NOT protected buttons)
	if (event.key === "Backspace" && editor.api.isEmpty(node)) {
		// Prevent deletion of protected button types
		if (PROTECTED_BUTTON_TYPES.includes(node.type)) {
			event.preventDefault();
			event.stopPropagation();
			return; // Don't delete, just prevent the action
		}
		event.preventDefault();
		event.stopPropagation();
		editor.tf.removeNodes({ at: path });
		return;
	}
}

export const FormLabelPlugin = createPlatePlugin({
	key: "formLabel",
	node: { isElement: true, component: FormLabelElement },
	options: { gutterPosition: "center" },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const FormInputPlugin = createPlatePlugin({
	key: "formInput",
	node: { isElement: true, component: FormInputElement },
	options: { gutterPosition: "center" },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

/**
 * Check if node is any form button
 */
function isFormButton(node: TElement): boolean {
	return node.type === "formButton";
}

export const FormButtonPlugin = createPlatePlugin({
	key: "formButton",
	node: {
		isElement: true,
		isVoid: true,
		isSelectable: false,
		component: FormButtonElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
		onChange: ({ editor }) => {
			// Redirect selection away from form buttons when it lands on them
			// Use a flag to prevent re-entrancy
			if ((editor as any).__redirectingSelection) return;

			const { selection } = editor;
			if (!selection) return;

			const blockPath = selection.anchor.path.slice(0, 1);
			const blockIndex = blockPath[0];
			const children = editor.children as TElement[];
			const currentNode = children[blockIndex];

			if (
				currentNode &&
				(currentNode.type === "formButton" || currentNode.type === "pageBreak")
			) {
				// Find the previous non-button block to select instead
				for (let i = blockIndex - 1; i >= 0; i--) {
					const prevNode = children[i];
					if (
						prevNode &&
						prevNode.type !== "formButton" &&
						prevNode.type !== "pageBreak" &&
						prevNode.type !== "formHeader"
					) {
						// Select the end of the previous block synchronously
						const prevPath = [i];
						const edges = editor.api.edges(prevPath);
						if (edges?.[1]) {
							(editor as any).__redirectingSelection = true;
							try {
								editor.tf.select(edges[1]);
							} finally {
								(editor as any).__redirectingSelection = false;
							}
							return;
						}
					}
				}
			}
		},
	},
	extendEditor: ({ editor }: any) => {
		const editorRef = editor as any;
		const { deleteBackward, deleteForward, deleteFragment } = editorRef;

		// ... (delete overrides remain the same, kept for brevity in this prompt context if unchanged)
		// Re-implementing delete overrides as they are inside the function I am replacing.

		// Prevent backspace from deleting any form button
		editorRef.deleteBackward = (unit: any) => {
			const block = editorRef.api.block();
			if (block) {
				const [_node, path] = block;
				if (path && path[0] > 0) {
					const prevIndex = path[0] - 1;
					const prevNode = editorRef.children[prevIndex] as TElement;
					if (prevNode && isFormButton(prevNode)) {
						const selection = editorRef.selection;
						if (selection && editorRef.api.isCollapsed(selection)) {
							const edges = editorRef.api.edges(path) as any;
							const start = edges?.[0];
							if (
								start &&
								PathApi.equals(selection.anchor.path, start.path) &&
								selection.anchor.offset === start.offset
							) {
								return;
							}
						}
					}
				}
			}
			deleteBackward(unit);
		};

		editorRef.deleteForward = (unit: any) => {
			const block = editorRef.api.block();
			if (block) {
				const [_node, path] = block;
				if (path) {
					const nextIndex = path[0] + 1;
					const nextNode = editorRef.children[nextIndex] as TElement;
					if (nextNode && isFormButton(nextNode)) {
						const selection = editorRef.selection;
						if (selection && editorRef.api.isCollapsed(selection)) {
							const edges = editorRef.api.edges(path) as any;
							const end = edges?.[1];
							if (
								end &&
								PathApi.equals(selection.anchor.path, end.path) &&
								selection.anchor.offset === end.offset
							) {
								return;
							}
						}
					}
				}
			}
			deleteForward(unit);
		};

		editorRef.deleteFragment = (direction: any) => {
			const { selection } = editorRef;
			if (!selection) {
				deleteFragment(direction);
				return;
			}
			const selectedNodes = Array.from(
				editorRef.api.nodes({
					at: selection,
					match: (n: TElement) => isFormButton(n),
				}),
			);
			if (selectedNodes.length > 0) return;
			deleteFragment(direction);
		};

		const originalRemoveNodes = editorRef.tf.removeNodes.bind(editorRef.tf);
		editorRef.tf.removeNodes = (options: any = {}) => {
			const selection = options.at || editorRef.selection;
			if (!selection) return originalRemoveNodes(options);
			const selectedNodes = Array.from(
				editorRef.api.nodes({
					at: selection,
					match: (n: TElement) => isFormButton(n),
				}),
			);
			if (selectedNodes.length > 0) return;
			return originalRemoveNodes(options);
		};

		const originalInsertText = editorRef.tf.insertText.bind(editorRef.tf);
		editorRef.tf.insertText = (text: string, options?: any) => {
			// Basic protection: don't insert if cursor is strictly after the last button of a page
			// For now, simpler validation relies on Normalizer to cleanup bad states.
			// But for immediate UI feedback:
			// Basic protection: don't insert if cursor is strictly after the last button of a page
			// For now, simpler validation relies on Normalizer to cleanup bad states.
			// But for immediate UI feedback:
			// We can't easily check "after button" without knowing WHICH button.
			// Rely on normalization for structure enforcement.
			return originalInsertText(text, options);
		};

		const originalSelect = editorRef.tf.select.bind(editorRef.tf);
		editorRef.tf.select = (target: any) => {
			// Check if selection target is on a form button and redirect
			if (target && typeof target === "object") {
				let targetPath: Path | null = null;

				// Handle different target formats
				if ("path" in target) {
					targetPath = target.path;
				} else if ("anchor" in target && target.anchor?.path) {
					targetPath = target.anchor.path;
				}

				if (targetPath && targetPath.length > 0) {
					const blockIndex = targetPath[0];
					const children = editorRef.children as TElement[];
					const targetNode = children[blockIndex];

					if (
						targetNode &&
						(targetNode.type === "formButton" ||
							targetNode.type === "pageBreak")
					) {
						// Find the previous non-button block to select instead
						for (let i = blockIndex - 1; i >= 0; i--) {
							const prevNode = children[i];
							if (
								prevNode &&
								prevNode.type !== "formButton" &&
								prevNode.type !== "pageBreak" &&
								prevNode.type !== "formHeader"
							) {
								// Select the end of the previous block
								const prevPath = [i];
								const edges = editorRef.api.edges(prevPath);
								if (edges?.[1]) {
									return originalSelect(edges[1]);
								}
							}
						}
						// If no previous block found, don't change selection
						return;
					}
				}
			}
			return originalSelect(target);
		};

		const originalInsertNodes = editorRef.tf.insertNodes.bind(editorRef.tf);
		editorRef.tf.insertNodes = (nodes: any, options: any = {}) => {
			const children = editorRef.children as TElement[];
			let insertPath = options.at;
			if (!insertPath && editorRef.selection) {
				insertPath = editorRef.selection.anchor?.path;
			}

			if (insertPath && Array.isArray(insertPath) && insertPath.length > 0) {
				const insertIndex = insertPath[0];

				// Validate insertion relative to buttons
				const prevNode = children[insertIndex - 1];
				if (prevNode && isFormButton(prevNode)) {
					// We are inserting immediately after a button
					const nodeArray = Array.isArray(nodes) ? nodes : [nodes];

					// Only allow PageBreaks after a button
					const allPageBreaks = nodeArray.every(
						(n: any) => n.type === "pageBreak",
					);

					if (!allPageBreaks) {
						// Redirect insertion to before the button
						return originalInsertNodes(nodes, {
							...options,
							at: [insertIndex - 1], // this might be wrong if button is at 0?
						});
					}
				}
			}

			return originalInsertNodes(nodes, options);
		};

		const originalMoveNodes = editorRef.moveNodes.bind(editorRef);
		editorRef.moveNodes = (options: any) => {
			// Similar logic: allow moving PageBreaks to be after buttons.
			// Prevent moving other things to be after buttons.
			const { to, at } = options;
			const children = editorRef.children as TElement[];

			// Destination check
			let targetIndex = -1;
			if (Array.isArray(to)) targetIndex = to[0];

			if (targetIndex > 0) {
				const prevNode = children[targetIndex - 1];
				if (prevNode && isFormButton(prevNode)) {
					// Moving something to be after a button.
					// Must be a PageBreak.
					if (at) {
						const entry = editorRef.api.node(at);
						if (entry) {
							const [node] = entry;
							if (node.type === "pageBreak") {
								return originalMoveNodes(options);
							}
						}
					}
					return; // Block move
				}
			}
			return originalMoveNodes(options);
		};
		// Normalize to enforce multi-page button logic
		const originalNormalizeNode = editorRef.normalizeNode.bind(editorRef);
		editorRef.normalizeNode = (entry: any) => {
			const [_node, path] = entry;

			// Only normalize at the editor root level
			if (path.length === 0) {
				// Access children directly from editor to ensure fresh state
				const getChildren = () => editorRef.children as TElement[];

				// 1. Ensure empty P at 0 if first block is Button
				if (getChildren().length > 0 && isFormButton(getChildren()[0])) {
					editorRef.tf.insertNodes(
						{ type: "p", children: [{ text: "" }] },
						{ at: [0] },
					);
					return;
				}

				let pageStartIndex = 0;
				for (let i = 0; i <= getChildren().length; i++) {
					const node = getChildren()[i];
					const isPageBreak = node?.type === "pageBreak";
					const isEnd = i === getChildren().length;

					if (isPageBreak || isEnd) {
						// Process Section [pageStartIndex, i-1]
						const pageEndIndex = i; // exclusive
						const isFirstPage = pageStartIndex === 0;
						// isLastPage = true if at document end OR next section is thank you page
						const isLastPage =
							isEnd || (isPageBreak && (node as any).isThankYouPage === true);

						// Determine if this is a Thank You section
						let isThankYouSection = false;
						let precedingBreakIndex = -1;
						if (!isFirstPage) {
							const prevBreak = getChildren()[pageStartIndex - 1];
							precedingBreakIndex = pageStartIndex - 1;
							if (
								prevBreak?.type === "pageBreak" &&
								(prevBreak as any).isThankYouPage
							) {
								isThankYouSection = true;
							}
						}

						// Scan for buttons and fields in this section
						const actionButtonIndices: number[] = []; // Track ALL action buttons (next/submit)
						const previousButtonIndices: number[] = []; // Track ALL previous buttons
						let hasFields = false;

						// First pass: find button positions and check for fields
						for (let j = pageStartIndex; j < pageEndIndex; j++) {
							const n = getChildren()[j];

							// Check for form fields
							if (
								[
									"formInput",
									"formTextarea",
									"formLabel",
									"formRadioGroup",
									"formCheckbox",
									"formSelect",
									"formDatePicker",
								].includes(n.type)
							) {
								hasFields = true;
							}

							if (n.type === "formButton") {
								const role = (n as any).buttonRole || "submit";
								if (role === "previous") {
									previousButtonIndices.push(j);
								} else {
									// Next or Submit - collect ALL of them
									actionButtonIndices.push(j);
								}
							}
						}

						// Remove duplicate Previous buttons (keep only the last one)
						if (previousButtonIndices.length > 1) {
							const indexToRemove = previousButtonIndices[0]; // Remove the first one
							console.log(
								"Normalize: Removing duplicate Previous button at",
								indexToRemove,
							);
							originalRemoveNodes({ at: [indexToRemove] });
							return; // Restart normalization
						}

						// Remove duplicate action buttons (keep only the last one)
						if (actionButtonIndices.length > 1) {
							const indexToRemove = actionButtonIndices[0]; // Remove the first one
							console.log(
								"Normalize: Removing duplicate action button at",
								indexToRemove,
							);
							originalRemoveNodes({ at: [indexToRemove] });
							return; // Restart normalization
						}

						const actionButtonIndex =
							actionButtonIndices.length > 0 ? actionButtonIndices[0] : -1;
						const previousButtonIndex =
							previousButtonIndices.length > 0 ? previousButtonIndices[0] : -1;

						// Update Preceding Page Break with hasFormFields state
						if (precedingBreakIndex !== -1) {
							const prevBreak = getChildren()[precedingBreakIndex] as any;
							const currentHasData = prevBreak.hasFormFields === true;
							if (currentHasData !== hasFields) {
								// console.log('Normalize: Updating PageBreak hasFormFields', { at: precedingBreakIndex, hasFields });
								editorRef.tf.setNodes(
									{ hasFormFields: hasFields },
									{ at: [precedingBreakIndex] },
								);
								return; // Restart normalization to apply change
							}
						}

						if (isThankYouSection) {
							// First, remove any buttons from thank you section
							for (let j = pageEndIndex - 1; j >= pageStartIndex; j--) {
								const n = getChildren()[j];
								if (n?.type === "formButton") {
									originalRemoveNodes({ at: [j] });
									return; // Restart normalization
								}
							}

							// Check if form fields exist in this thank you section
							// (excluding buttons - they should already be removed above)
							let hasFormFields = false;
							for (let j = pageStartIndex; j < pageEndIndex; j++) {
								const n = getChildren()[j];
								if (
									n &&
									[
										"formInput",
										"formTextarea",
										"formLabel",
										"formRadioGroup",
										"formCheckbox",
										"formSelect",
										"formDatePicker",
									].includes(n.type)
								) {
									hasFormFields = true;
									break;
								}
							}

							// If form fields exist, convert thank you page to normal page
							if (hasFormFields && precedingBreakIndex !== -1) {
								console.log(
									"Normalize: Converting Thank You page to normal page at",
									precedingBreakIndex,
								);
								editorRef.tf.setNodes(
									{ isThankYouPage: false },
									{ at: [precedingBreakIndex] },
								);
								return; // Restart normalization (will now process as normal page)
							}

							// No form fields - this is a valid thank you page, skip button enforcement
							pageStartIndex = i + 1;
							continue;
						}

						// Second pass: check for orphaned content AFTER action button
						// For Thank You pages, action button is Submit.
						if (actionButtonIndex !== -1) {
							for (let j = actionButtonIndex + 1; j < pageEndIndex; j++) {
								const n = getChildren()[j];
								// Allow empty trailing paragraph
								if (
									j === pageEndIndex - 1 &&
									n.type === "p" &&
									editorRef.api.isEmpty(n)
								) {
									continue;
								}
								// Allow previous button after action button (will be repositioned later)
								if (n.type === "formButton") {
									continue;
								}

								// Found orphaned content after action button - MOVE it before the button
								// This allows "Type to Add" behavior
								// Even for Thank You pages, content should be BEFORE the button.
								editorRef.tf.moveNodes({ at: [j], to: [actionButtonIndex] });
								return;
							}
						}

						// --- Button Enforcement (Normal Pages AND Thank You Pages) ---
						// ... logic continues ...

						// --- Button Enforcement (Normal Pages) ---

						// 1. First Page: Remove Previous Button if present
						if (isFirstPage && previousButtonIndex !== -1) {
							console.log(
								"Normalize: Removing Previous Button on First Page at",
								previousButtonIndex,
							);
							originalRemoveNodes({ at: [previousButtonIndex] });
							return;
						}

						// 2. Ensure Action Button Exists
						if (actionButtonIndex === -1) {
							console.log(
								"Normalize: Inserting Missing Action Button at",
								pageEndIndex,
							);
							const role = isLastPage ? "submit" : "next";
							const labelText = role === "next" ? "Next" : "Submit";
							editorRef.tf.insertNodes(
								{
									type: "formButton",
									buttonRole: role,
									label: labelText,
									children: [{ text: "" }],
								},
								{ at: [pageEndIndex] },
							);
							return;
						}

						// 3. Validate Action Button Role & Text
						// "Smart Update": Only update if role is wrong.
						// Access button directly from editor to ensure fresh state
						const actionBtn = getChildren()[actionButtonIndex];
						const currentRole = (actionBtn as any).buttonRole || "submit";
						const expectedRole = isLastPage ? "submit" : "next";

						if (currentRole !== expectedRole) {
							console.log("Normalize: Updating Action Button Role", {
								from: currentRole,
								to: expectedRole,
								index: actionButtonIndex,
							});
							// Check if we should update label (if it matches the OLD default)
							const oldDefault = currentRole === "submit" ? "Submit" : "Next";
							// Re-read button - check label property first, fallback to children for backwards compat
							const btn = getChildren()[actionButtonIndex];
							const currentLabel =
								(btn as any).label ?? (btn?.children?.[0] as any)?.text;
							const newLabel =
								currentLabel === oldDefault
									? expectedRole === "submit"
										? "Submit"
										: "Next"
									: currentLabel;

							// Replace the entire button node (use originalRemoveNodes to bypass override)
							originalRemoveNodes({ at: [actionButtonIndex] });
							editorRef.tf.insertNodes(
								{
									type: "formButton",
									buttonRole: expectedRole,
									label: newLabel,
									children: [{ text: "" }],
								},
								{ at: [actionButtonIndex] },
							);
							return;
						}

						// 4. Ensure Previous Button (Non-First Page)
						if (!isFirstPage && previousButtonIndex === -1) {
							console.log(
								"Normalize: Inserting Previous Button at",
								actionButtonIndex,
							);
							editorRef.tf.insertNodes(
								{
									type: "formButton",
									buttonRole: "previous",
									label: "Previous",
									children: [{ text: "" }],
								},
								{ at: [actionButtonIndex] },
							);
							return;
						}

						// 5. Validate Previous Button Position
						// Should be immediately before Action Button
						if (
							!isFirstPage &&
							previousButtonIndex !== -1 &&
							previousButtonIndex !== actionButtonIndex - 1
						) {
							console.log("Normalize: Moving Previous Button", {
								from: previousButtonIndex,
								to: actionButtonIndex,
							});
							editorRef.tf.moveNodes({
								at: [previousButtonIndex],
								to: [actionButtonIndex],
							});
							return;
						}

						pageStartIndex = i + 1;
					}
				}
			}

			return originalNormalizeNode(entry);
		};

		return editorRef;
	},
});

export const FormTextareaPlugin = createPlatePlugin({
	key: "formTextarea",
	node: { isElement: true, component: FormTextareaElement },
	options: { gutterPosition: "top" },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const PageBreakPlugin = createPlatePlugin({
	key: "pageBreak",
	node: {
		isElement: true,
		isVoid: true,
		isSelectable: true,
		component: PageBreakElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

/**
 * Global keyboard navigation plugin to skip form buttons when navigating with Tab/Arrow keys.
 * This applies to ALL blocks, not just form blocks.
 */
function handleGlobalKeyDown(
	editor: PlateEditor,
	event: React.KeyboardEvent,
): void {
	// [TAB DEBUG] - remove after fix verified
	if (event.key === "Tab") {
		console.log(
			"[TAB DEBUG] handleGlobalKeyDown entry, block:",
			editor.api.block()?.[0]?.type,
			"alreadyHandled:",
			(event as any).__formBlockHandled,
		);
	}

	// Don't interfere if already handled by form block handlers
	if ((event as any).__formBlockHandled) return;

	const block = editor.api.block();
	if (!block) return;

	const [_node, path] = block;

	// Only handle Tab and Arrow keys for navigation
	if (event.key === "Tab" && !event.shiftKey) {
		const nextPath = findNextNonButtonPath(editor, path);
		if (nextPath) {
			event.preventDefault();
			event.stopPropagation();
			event.nativeEvent.stopImmediatePropagation();
			(event as any).__formBlockHandled = true;
			moveToPath(editor, nextPath);
		} else {
			// No next block - create new p block before submit button
			event.preventDefault();
			event.stopPropagation();
			event.nativeEvent.stopImmediatePropagation();
			(event as any).__formBlockHandled = true;

			// Find insert position (before first formButton or at end)
			const children = editor.children as TElement[];
			let insertIndex = children.length;
			for (let i = path[0] + 1; i < children.length; i++) {
				if (children[i].type === "formButton") {
					insertIndex = i;
					break;
				}
			}

			// Insert new paragraph and move to it
			const insertPath: Path = [insertIndex];
			editor.tf.insertNodes(
				{ type: "p", children: [{ text: "" }] } as TElement,
				{ at: insertPath },
			);
			moveToPath(editor, insertPath);
		}
		return;
	}

	if (event.key === "Tab" && event.shiftKey) {
		const prevPath = findPrevNonButtonPath(editor, path);
		if (prevPath) {
			const defaultPrevPath = PathApi.previous(path);
			const defaultPrevNode = defaultPrevPath
				? editor.api.node(defaultPrevPath)
				: null;
			if (
				defaultPrevNode &&
				(defaultPrevNode[0] as TElement).type === "formButton"
			) {
				event.preventDefault();
				event.stopPropagation();
				event.nativeEvent.stopImmediatePropagation();
				(event as any).__formBlockHandled = true;
				moveToPath(editor, prevPath);
			}
		}
		return;
	}

	// ArrowDown at the end of block content
	if (event.key === "ArrowDown") {
		const nextPath = findNextNonButtonPath(editor, path);
		if (nextPath) {
			const defaultNextPath = PathApi.next(path);
			const defaultNextNode = defaultNextPath
				? editor.api.node(defaultNextPath)
				: null;
			if (
				defaultNextNode &&
				(defaultNextNode[0] as TElement).type === "formButton"
			) {
				event.preventDefault();
				event.stopPropagation();
				(event as any).__formBlockHandled = true;
				moveToPath(editor, nextPath);
			}
		} else {
			// Block ArrowDown from entering trailing buttons - keep cursor where it is
			event.preventDefault();
			event.stopPropagation();
			(event as any).__formBlockHandled = true;
			// Explicitly maintain current selection to prevent cursor from vanishing
			const currentSelection = editor.selection;
			if (currentSelection) {
				editor.tf.select(currentSelection);
			}
		}
		return;
	}

	// ArrowUp at the start of block content
	if (event.key === "ArrowUp") {
		const prevPath = findPrevNonButtonPath(editor, path);
		if (prevPath) {
			const defaultPrevPath = PathApi.previous(path);
			const defaultPrevNode = defaultPrevPath
				? editor.api.node(defaultPrevPath)
				: null;
			if (
				defaultPrevNode &&
				(defaultPrevNode[0] as TElement).type === "formButton"
			) {
				event.preventDefault();
				event.stopPropagation();
				(event as any).__formBlockHandled = true;
				moveToPath(editor, prevPath);
			}
		}
		return;
	}

	// ArrowLeft at start of block → block if previous is a form button
	if (event.key === "ArrowLeft") {
		const children = editor.children as TElement[];
		const prevIndex = path[0] - 1;
		const prevNode = children[prevIndex];

		// Check if cursor is at the start of the block
		const selection = editor.selection;
		if (selection) {
			const edges = editor.api.edges(path);
			const start = edges?.[0];
			if (
				start &&
				selection.anchor.offset === start.offset &&
				PathApi.equals(selection.anchor.path, start.path)
			) {
				// Cursor is at start of block - check previous block
				if (
					prevNode &&
					(prevNode.type === "formButton" || prevNode.type === "pageBreak")
				) {
					// Block left arrow from entering button/pagebreak
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}
		}
	}

	// Enter → if next block is a form button, insert new paragraph before it
	if (event.key === "Enter" && !event.shiftKey) {
		const children = editor.children as TElement[];
		const currentIndex = path[0];
		const currentNode = children[currentIndex];

		// If cursor is somehow ON a button, block Enter entirely
		if (
			currentNode &&
			(currentNode.type === "formButton" || currentNode.type === "pageBreak")
		) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}

		const nextIndex = currentIndex + 1;
		const nextNode = children[nextIndex];

		// If next block is a form button, insert new paragraph before it (button stays at end)
		if (
			nextNode &&
			(nextNode.type === "formButton" || nextNode.type === "pageBreak")
		) {
			event.preventDefault();
			event.stopPropagation();
			const insertPath = [nextIndex];
			editor.tf.insertNodes(
				{ type: "p", children: [{ text: "" }] } as TElement,
				{
					at: insertPath,
				},
			);
			// Move to the new paragraph
			moveToPath(editor, insertPath);
			return;
		}
	}
}

const GlobalKeyboardNavigationPlugin = createPlatePlugin({
	key: "globalKeyboardNavigation",
	priority: 1000, // High priority to run before IndentPlugin's Tab handler
	handlers: {
		onKeyDown: ({ editor, event }) => handleGlobalKeyDown(editor, event),
	},
});

export const FormBlocksKit = [
	GlobalKeyboardNavigationPlugin,
	FormLabelPlugin,
	FormInputPlugin,
	FormButtonPlugin,
	FormTextareaPlugin,
	PageBreakPlugin,
];
