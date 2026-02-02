import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";

export function FormInputElement({
	className,
	children,
	...props
}: PlateElementProps) {
	const { attributes, element, ...rest } = props;
	const placeholder = element.placeholder as string | undefined;

	return (
		<PlateElement
			attributes={{ ...attributes, placeholder }}
			className={cn(
				"relative my-1 flex h-9 w-full max-w-md items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs cursor-text caret-current",
				"focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
				className,
			)}
			element={element}
			{...rest}
		>
			<span className="flex-1 min-w-px outline-none text-muted-foreground">
				{children}
			</span>
		</PlateElement>
	);
}
