import { PathApi } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { FormInputElement } from "@/components/ui/form-input-node";
import { FormLabelElement } from "@/components/ui/form-label-node";

// Form Label Plugin - editable label block with optional required indicator
// Tab key moves to next sibling block (typically formInput)
export const FormLabelPlugin = createPlatePlugin({
	key: "formLabel",
	node: {
		isElement: true,
		component: FormLabelElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => {
			if (event.key === "Tab" && !event.shiftKey) {
				const block = editor.api.block();
				if (block && block[0].type === "formLabel") {
					event.preventDefault();
					const nextPath = PathApi.next(block[1]);
					const nextNode = editor.api.node(nextPath);
					if (nextNode) {
						editor.tf.select({ path: [...nextPath, 0], offset: 0 });
					}
				}
			}
		},
	},
});

// Form Input Plugin - editable input placeholder block
// Shift+Tab moves to previous sibling block (typically formLabel)
export const FormInputPlugin = createPlatePlugin({
	key: "formInput",
	node: {
		isElement: true,
		component: FormInputElement,
	},
	handlers: {
		onKeyDown: ({ editor, event }) => {
			if (event.key === "Tab" && event.shiftKey) {
				const block = editor.api.block();
				if (block && block[0].type === "formInput") {
					event.preventDefault();
					const prevPath = PathApi.previous(block[1]);
					if (prevPath) {
						const prevNode = editor.api.node(prevPath);
						if (prevNode) {
							editor.tf.select({ path: [...prevPath, 0], offset: 0 });
						}
					}
				}
			}
		},
	},
});

export const FormBlocksKit = [FormLabelPlugin, FormInputPlugin];
