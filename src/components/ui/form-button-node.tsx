import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useSelected } from "platejs/react";
import { cn } from "@/lib/utils";

export type ButtonRole = "next" | "previous" | "submit";

export interface FormButtonElementData {
	type: "formButton";
	buttonRole: ButtonRole;
	children: [{ text: string }];
}

export function createFormButtonNode(
	role: ButtonRole,
	text?: string,
): FormButtonElementData {
	const defaultText = role === "next" ? "Next" : role === "previous" ? "Previous" : "Submit";
	return {
		type: "formButton",
		buttonRole: role,
		children: [{ text: text ?? defaultText }],
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

export function FormButtonElement({
	className,
	children,
	...props
}: PlateElementProps) {
	const { editor, element } = props;
	const buttonRole = (element.buttonRole as ButtonRole) ?? "submit";
	const isEmpty = editor.api.isEmpty(element);
	const placeholder = getPlaceholderForRole(buttonRole);
	const selected = useSelected();

	const isPrevious = buttonRole === "previous";

	// Get current button text for the input
	const currentText = extractTextFromChildren(
		element.children as Array<{ text?: string }>
	);

	/**
	 * Sync button text to all other buttons with the same role on blur
	 */
	const syncButtonText = useCallback(
		(newText: string) => {
			// Don't sync if empty (let each button keep its placeholder)
			if (!newText.trim()) return;

			// Find all other buttons with the same role and update their text
			for (const [node, nodePath] of editor.api.nodes({
				match: { type: "formButton" },
			})) {
				// Skip the current element
				if (node === element) continue;

				// Only sync buttons with the same role
				const nodeRole = (node.buttonRole as ButtonRole) ?? "submit";
				if (nodeRole !== buttonRole) continue;

				// Get the existing text of this button
				const existingText = extractTextFromChildren(
					node.children as Array<{ text?: string }>
				);

				// Only update if text is different
				if (existingText !== newText) {
					// Update the text by replacing children
					editor.tf.removeNodes({ at: [...nodePath, 0] });
					editor.tf.insertNodes({ text: newText }, { at: [...nodePath, 0] });
				}
			}
		},
		[editor, element, buttonRole]
	);

	/**
	 * Handle label change from the input field
	 */
	const handleLabelChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newText = e.target.value;
			const path = editor.api.findPath(element);
			if (!path) return;

			// Update the current button's text
			editor.tf.removeNodes({ at: [...path, 0] });
			editor.tf.insertNodes({ text: newText }, { at: [...path, 0] });
		},
		[editor, element]
	);

	/**
	 * Sync text to other buttons when input loses focus
	 */
	const handleInputBlur = useCallback(() => {
		const text = extractTextFromChildren(
			element.children as Array<{ text?: string }>
		);
		syncButtonText(text);
	}, [element, syncButtonText]);

	/**
	 * Legacy blur handler for direct button text editing
	 */
	const handleBlur = useCallback(() => {
		const text = extractTextFromChildren(
			element.children as Array<{ text?: string }>
		);
		syncButtonText(text);
	}, [element, syncButtonText]);

	return (
		<PlateElement className={cn("m-0 px-0 py-1", className)} {...props}>
			<div className="inline-flex items-center gap-1 group">
				{/* Button visual */}
				<span
					onBlur={handleBlur}
					className={cn(
						"inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow transition-colors",
						"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
						isPrevious
							? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
							: "bg-primary text-primary-foreground hover:bg-primary/90"
					)}
				>
					{isPrevious && <ChevronLeft className="h-4 w-4" />}
					<span className="relative">
						{isEmpty && (
							<span
								className={cn(
									"absolute pointer-events-none select-none whitespace-nowrap",
									isPrevious
										? "text-secondary-foreground/50"
										: "text-primary-foreground/50"
								)}
							>
								{placeholder}
							</span>
						)}
						<span className={cn(isEmpty ? "text-transparent" : "")}>
							{children}
						</span>
					</span>
					{!isPrevious && <ChevronRight className="h-4 w-4" />}
				</span>
			</div>
		</PlateElement>
	);
}
