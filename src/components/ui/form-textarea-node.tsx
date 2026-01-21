import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";

export function FormTextareaElement({
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
				"relative my-1 flex min-h-24 w-full max-w-md items-start rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs",
				"focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
				className,
			)}
			element={element}
			{...rest}
		>
			{children}
		</PlateElement>
	);
}
