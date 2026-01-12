import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";

export function FormInputElement({
	className,
	children,
	...props
}: PlateElementProps) {
	const placeholder = props.element.placeholder as string | undefined;
	const isEmpty = props.editor.api.isEmpty(props.element);

	return (
		<PlateElement className={cn("m-0 px-0 py-1", className)} {...props}>
			<div
				className={cn(
					"relative flex h-9 w-full max-w-md items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs",
					"focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
				)}
			>
				{isEmpty && placeholder && (
					<span className="absolute text-muted-foreground pointer-events-none select-none">
						{placeholder}
					</span>
				)}
				<span className={cn(isEmpty ? "text-transparent" : "")}>
					{children}
				</span>
			</div>
		</PlateElement>
	);
}
