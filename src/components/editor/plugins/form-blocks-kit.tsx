import { type Path, PathApi, type TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import { createPlatePlugin } from "platejs/react";
import { FormButtonElement } from "@/components/ui/form-button-node";
import { FormInputElement } from "@/components/ui/form-input-node";
import { FormLabelElement } from "@/components/ui/form-label-node";
import { FormTextareaElement } from "@/components/ui/form-textarea-node";

const FORM_FIELD_TYPES = [
	"formInput",
	"formTextarea",
	"formButton",
	"formLabel",
];

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
		editor.tf.insertNodes(
			{ type: "p", children: [{ text: "" }] } as TElement,
			{ at: nextPath },
		);
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

	// Backspace on empty → delete current block
	if (event.key === "Backspace" && editor.api.isEmpty(node)) {
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

export const FormButtonPlugin = createPlatePlugin({
	key: "formButton",
	node: { isElement: true, component: FormButtonElement },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const FormTextareaPlugin = createPlatePlugin({
	key: "formTextarea",
	node: { isElement: true, component: FormTextareaElement },
	handlers: {
		onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
	},
});

export const FormBlocksKit = [
	FormLabelPlugin,
	FormInputPlugin,
	FormButtonPlugin,
	FormTextareaPlugin,
];
