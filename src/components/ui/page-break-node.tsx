import type { PlateElementProps } from "platejs/react";
import {
	PlateElement,
	useFocused,
	useEditorRef,
	useReadOnly,
	useSelected,
} from "platejs/react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface PageBreakElementData {
	type: "pageBreak";
	id?: string;
	isThankYouPage: boolean;
	children: [{ text: "" }];
}

export function createPageBreakNode(
	data: Partial<Omit<PageBreakElementData, "type" | "children">> = {},
): PageBreakElementData {
	return {
		type: "pageBreak",
		isThankYouPage: data.isThankYouPage ?? false,
		children: [{ text: "" }],
	};
}

export function PageBreakElement(props: PlateElementProps) {
	const { element, children } = props;
	const editor = useEditorRef();
	const readOnly = useReadOnly();
	const selected = useSelected();
	const focused = useFocused();

	const isThankYouPage = (element.isThankYouPage as boolean) ?? false;

	// Calculate page number by counting pageBreak elements before this one
	const pageNumber = (() => {
		const path = editor.api.findPath(element);
		if (!path) return 2;

		let count = 2; // Page 1 is before first pageBreak, so this starts at 2
		for (const [, nodePath] of editor.api.nodes({
			match: { type: "pageBreak" },
		})) {
			// Count pageBreaks that come before current element
			if (nodePath[0] < path[0]) {
				count++;
			}
		}
		return count;
	})();

	const handleThankYouToggle = (checked: boolean) => {
		const path = editor.api.findPath(element);
		if (!path) return;

		if (checked) {
			// Remove isThankYouPage from all other pageBreak elements
			for (const [, nodePath] of editor.api.nodes({
				match: { type: "pageBreak" },
			})) {
				if (nodePath[0] !== path[0]) {
					editor.tf.setNodes({ isThankYouPage: false }, { at: nodePath });
				}
			}
		}

		// Set the current element's isThankYouPage
		editor.tf.setNodes({ isThankYouPage: checked }, { at: path });
	};

	return (
		<PlateElement {...props}>
			<div
				contentEditable={false}
				className={cn(
					"relative my-6 flex items-center justify-center select-none",
					selected && focused && "ring-2 ring-ring ring-offset-2 rounded",
					!readOnly && "cursor-pointer",
				)}
			>
				{/* Left dashed line */}
				<div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />

				{/* Page label */}
				<div className="mx-4 flex items-center gap-4 text-sm text-muted-foreground">
					<span className="font-medium">Page {pageNumber}</span>

					{/* Thank you page toggle */}
					<div className="flex items-center gap-2">
						<Label
							htmlFor={`thank-you-toggle-${element.id || pageNumber}`}
							className="text-xs text-muted-foreground cursor-pointer"
						>
							'Thank you' page
						</Label>
						<Switch
							id={`thank-you-toggle-${element.id || pageNumber}`}
							checked={isThankYouPage}
							onCheckedChange={handleThankYouToggle}
							disabled={readOnly}
							onMouseDown={(e) => e.stopPropagation()}
						/>
					</div>
				</div>

				{/* Right dashed line */}
				<div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
			</div>
			{children}
		</PlateElement>
	);
}
