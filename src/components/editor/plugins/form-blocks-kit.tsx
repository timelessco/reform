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

function handleFormBlockKeyDown(
	editor: PlateEditor,
	event: React.KeyboardEvent,
): void {
	// Prevent double-handling when multiple form plugins process same event
	if ((event as any).__formBlockHandled) return;

	const block = editor.api.block();
	if (!block || !FORM_FIELD_TYPES.includes(block[0].type)) return;

	// Mark as handled before any action
	(event as any).__formBlockHandled = true;

	const [node, path] = block;

	// Tab → move to next sibling block
	if (event.key === "Tab" && !event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();
		const nextPath = PathApi.next(path);
		moveToPath(editor, nextPath);
		return;
	}

	// Shift+Tab → move to previous sibling block
	if (event.key === "Tab" && event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();
		const prevPath = PathApi.previous(path);
		if (prevPath) {
			moveToPath(editor, prevPath);
		}
		return;
	}

	// Enter → create new empty paragraph after current block
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		event.stopPropagation();
		const nextPath = PathApi.next(path);
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
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const FormInputPlugin = createPlatePlugin({
	key: "formInput",
	node: { isElement: true, component: FormInputElement },
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
	node: { isElement: true, component: FormButtonElement },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
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
			// Rely on BlockDraggable hiding to prevent selection of invalid areas
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
					const allPageBreaks = nodeArray.every((n: any) => n.type === "pageBreak");

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
							if (node.type === 'pageBreak') {
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
						{ at: [0] }
					);
					return;
				}

				let pageStartIndex = 0;
				for (let i = 0; i <= getChildren().length; i++) {
					const node = getChildren()[i];
					const isPageBreak = node?.type === 'pageBreak';
					const isEnd = i === getChildren().length;

					if (isPageBreak || isEnd) {
						// Process Section [pageStartIndex, i-1]
						const pageEndIndex = i; // exclusive
						const isFirstPage = (pageStartIndex === 0);
						// isLastPage = true if at document end OR next section is thank you page
						const isLastPage = isEnd || (isPageBreak && (node as any).isThankYouPage === true);

						// Determine if this is a Thank You section
						let isThankYouSection = false;
						let precedingBreakIndex = -1;
						if (!isFirstPage) {
							const prevBreak = getChildren()[pageStartIndex - 1];
							precedingBreakIndex = pageStartIndex - 1;
							if (prevBreak?.type === 'pageBreak' && (prevBreak as any).isThankYouPage) {
								isThankYouSection = true;
							}
						}

						// Scan for buttons and fields in this section
						let actionButtonIndex = -1;
						let previousButtonIndex = -1;
						let hasFields = false;

						// First pass: find button positions and check for fields
						for (let j = pageStartIndex; j < pageEndIndex; j++) {
							const n = getChildren()[j];

							// Check for form fields
							if (['formInput', 'formTextarea', 'formLabel', 'formRadioGroup', 'formCheckbox', 'formSelect', 'formDatePicker'].includes(n.type)) {
								hasFields = true;
							}

							if (n.type === 'formButton') {
								const role = (n as any).buttonRole || 'submit';
								if (role === 'previous') {
									previousButtonIndex = j;
								} else {
									// Next or Submit - take the LAST one found
									actionButtonIndex = j;
								}
							}
						}

						// Update Preceding Page Break with hasFormFields state
						if (precedingBreakIndex !== -1) {
							const prevBreak = getChildren()[precedingBreakIndex] as any;
							const currentHasData = prevBreak.hasFormFields === true;
							if (currentHasData !== hasFields) {
								// console.log('Normalize: Updating PageBreak hasFormFields', { at: precedingBreakIndex, hasFields });
								editorRef.tf.setNodes({ hasFormFields: hasFields }, { at: [precedingBreakIndex] });
								return; // Restart normalization to apply change
							}
						}

						if (isThankYouSection) {
							// Check for forbidden fields in Thank You section
							if (hasFields) {
								// Revert to Normal Page (this will also update hasFormFields in next pass, or we did it above)
								// Actually, if hasFields is true, we already set hasFormFields=true above.
								// Now we also force isThankYouPage=false.
								// We can do both? setNodes merges? No, separate calls if we returned above.
								// But we returned above if hasFormFields changed.
								// If we are here, hasFormFields is consistent.
								// So if hasFields is true, isThankYouPage MUST be false.
								// If it is currently true (isThankYouSection=true), we must fix it.
								editorRef.tf.setNodes(
									{ isThankYouPage: false },
									{ at: [precedingBreakIndex] }
								);
								return;
							}

							// Remove buttons if present (Thank You page should have NO buttons)
							if (actionButtonIndex !== -1 || previousButtonIndex !== -1) {
								const btnIndex = actionButtonIndex !== -1 ? actionButtonIndex : previousButtonIndex;
								editorRef.tf.removeNodes({ at: [btnIndex] });
								return;
							}

							// Done with this section (skip button enforcement)
							pageStartIndex = i + 1;
							continue;
						}

						// Second pass: check for orphaned content AFTER action button
						// For Thank You pages, action button is Submit.
						if (actionButtonIndex !== -1) {
							for (let j = actionButtonIndex + 1; j < pageEndIndex; j++) {
								const n = getChildren()[j];
								// Allow empty trailing paragraph
								if (j === pageEndIndex - 1 && n.type === 'p' && editorRef.api.isEmpty(n)) {
									continue;
								}
								// Allow previous button after action button (will be repositioned later)
								if (n.type === 'formButton') {
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
							console.log('Normalize: Removing Previous Button on First Page at', previousButtonIndex);
							originalRemoveNodes({ at: [previousButtonIndex] });
							return;
						}

						// 2. Ensure Action Button Exists
						if (actionButtonIndex === -1) {
							console.log('Normalize: Inserting Missing Action Button at', pageEndIndex);
							const role = isLastPage ? 'submit' : 'next';
							const text = role === 'next' ? 'Next' : 'Submit';
							editorRef.tf.insertNodes({
								type: 'formButton',
								buttonRole: role,
								children: [{ text }]
							}, { at: [pageEndIndex] });
							return;
						}

						// 3. Validate Action Button Role & Text
						// "Smart Update": Only update if role is wrong.
						// Access button directly from editor to ensure fresh state
						const actionBtn = getChildren()[actionButtonIndex];
						const currentRole = (actionBtn as any).buttonRole || 'submit';
						const expectedRole = isLastPage ? 'submit' : 'next';

						if (currentRole !== expectedRole) {
							console.log('Normalize: Updating Action Button Role', { from: currentRole, to: expectedRole, index: actionButtonIndex });
							// Check if we should update text (if it matches the OLD default)
							const oldDefault = currentRole === 'submit' ? 'Submit' : 'Next';
							// Re-read button to get fresh children
							const currentText = (getChildren()[actionButtonIndex]?.children?.[0] as any)?.text;

							// Update role first
							editorRef.tf.setNodes({ buttonRole: expectedRole }, { at: [actionButtonIndex] });

							// Update text separately using removeNodes + insertNodes (setNodes can't update children)
							if (currentText === oldDefault) {
								const newText = expectedRole === 'submit' ? 'Submit' : 'Next';
								console.log('Normalize: Updating Action Button Text', { from: currentText, to: newText });
								editorRef.tf.removeNodes({ at: [actionButtonIndex, 0] });
								editorRef.tf.insertNodes({ text: newText }, { at: [actionButtonIndex, 0] });
							}
							return;
						}

						// 4. Ensure Previous Button (Non-First Page)
						if (!isFirstPage && previousButtonIndex === -1) {
							console.log('Normalize: Inserting Previous Button at', actionButtonIndex);
							editorRef.tf.insertNodes({
								type: 'formButton',
								buttonRole: 'previous',
								children: [{ text: 'Previous' }]
							}, { at: [actionButtonIndex] });
							return;
						}

						// 5. Validate Previous Button Position
						// Should be immediately before Action Button
						if (!isFirstPage && previousButtonIndex !== -1 && previousButtonIndex !== actionButtonIndex - 1) {
							console.log('Normalize: Moving Previous Button', { from: previousButtonIndex, to: actionButtonIndex });
							editorRef.tf.moveNodes({ at: [previousButtonIndex], to: [actionButtonIndex] });
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
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const PageBreakPlugin = createPlatePlugin({
	key: "pageBreak",
	node: { isElement: true, isVoid: true, component: PageBreakElement },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const FormBlocksKit = [
	FormLabelPlugin,
	FormInputPlugin,
	FormButtonPlugin,
	FormTextareaPlugin,
	PageBreakPlugin,
];
