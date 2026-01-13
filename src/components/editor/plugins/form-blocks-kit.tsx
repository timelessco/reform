import { PathApi } from "platejs";
import type { PlateEditor } from "platejs/react";
import { createPlatePlugin } from "platejs/react";
import { FormInputElement } from "@/components/ui/form-input-node";
import { FormLabelElement } from "@/components/ui/form-label-node";
import { FormButtonElement } from "@/components/ui/form-button-node";
import { FormTextareaElement } from "@/components/ui/form-textarea-node";

// Helper: Move to next sibling block
function moveToNextBlock(editor: PlateEditor, currentPath: number[]): boolean {
	const nextPath = PathApi.next(currentPath);
	const nextNode = editor.api.node(nextPath);
	if (nextNode) {
		editor.tf.select({ path: [...nextPath, 0], offset: 0 });
		return true;
	}
	return false;
}

// Helper: Move to previous sibling block
function moveToPreviousBlock(editor: PlateEditor, currentPath: number[]): boolean {
	const prevPath = PathApi.previous(currentPath);
	if (prevPath) {
		const prevNode = editor.api.node(prevPath);
		if (prevNode) {
			editor.tf.select({ path: [...prevPath, 0], offset: 0 });
			return true;
		}
	}
	return false;
}

// Helper: Delete empty block
function deleteEmptyBlock(editor: PlateEditor, block: [any, number[]]): boolean {
	const [node, path] = block;
	if (editor.api.isEmpty(node)) {
		editor.tf.removeNodes({ at: path });
		return true;
	}
	return false;
}

// Form Label Plugin - editable label block with optional required indicator
// Tab: Move to next block | Shift+Tab: Move to previous block
// Enter: Move to next block | Backspace (empty): Delete block
export const FormLabelPlugin = createPlatePlugin({
	key: "formLabel",
	node: {
		isElement: true,
		component: FormLabelElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => {
			const block = editor.api.block();
			if (!block || block[0].type !== "formLabel") return;

			const [node, path] = block;

			// Tab: Move to next block
			if (event.key === "Tab" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToNextBlock(editor, path);
				return;
			}

			// Shift+Tab: Move to previous block
			if (event.key === "Tab" && event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToPreviousBlock(editor, path);
				return;
			}

			// Enter: Move to next block instead of creating new line
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToNextBlock(editor, path);
				return;
			}

			// Backspace on empty block: Delete the block
			if (event.key === "Backspace" && editor.api.isEmpty(node)) {
				event.preventDefault();
				event.stopPropagation();
				deleteEmptyBlock(editor, block);
				return;
			}
		},
	},
});

// Form Input Plugin - editable input placeholder block
// Tab: Move to next block | Shift+Tab: Move to previous block
// Enter: Move to next block | Backspace (empty): Delete block
export const FormInputPlugin = createPlatePlugin({
	key: "formInput",
	node: {
		isElement: true,
		component: FormInputElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => {
			const block = editor.api.block();
			if (!block || block[0].type !== "formInput") return;

			const [node, path] = block;

			// Tab: Move to next block
			if (event.key === "Tab" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToNextBlock(editor, path);
				return;
			}

			// Shift+Tab: Move to previous block
			if (event.key === "Tab" && event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToPreviousBlock(editor, path);
				return;
			}

			// Enter: Move to next block instead of creating new line
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToNextBlock(editor, path);
				return;
			}

			// Backspace on empty block: Delete the block
			if (event.key === "Backspace" && editor.api.isEmpty(node)) {
				event.preventDefault();
				event.stopPropagation();
				deleteEmptyBlock(editor, block);
				return;
			}
		},
	},
});

// Form Button Plugin - standalone button element
export const FormButtonPlugin = createPlatePlugin({
	key: "formButton",
	node: {
		isElement: true,
		component: FormButtonElement,
	},
});

// Form Textarea Plugin - multi-line editable textarea placeholder block
// Tab: Move to next block | Shift+Tab: Move to previous block
// Enter: Move to next block | Backspace (empty): Delete block
export const FormTextareaPlugin = createPlatePlugin({
	key: "formTextarea",
	node: {
		isElement: true,
		component: FormTextareaElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => {
			const block = editor.api.block();
			if (!block || block[0].type !== "formTextarea") return;

			const [node, path] = block;

			// Tab: Move to next block
			if (event.key === "Tab" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToNextBlock(editor, path);
				return;
			}

			// Shift+Tab: Move to previous block
			if (event.key === "Tab" && event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToPreviousBlock(editor, path);
				return;
			}

			// Enter: Move to next block instead of creating new line
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				moveToNextBlock(editor, path);
				return;
			}

			// Backspace on empty block: Delete the block
			if (event.key === "Backspace" && editor.api.isEmpty(node)) {
				event.preventDefault();
				event.stopPropagation();
				deleteEmptyBlock(editor, block);
				return;
			}
		},
	},
});

export const FormBlocksKit = [
	FormLabelPlugin,
	FormInputPlugin,
	FormButtonPlugin,
	FormTextareaPlugin,
];
