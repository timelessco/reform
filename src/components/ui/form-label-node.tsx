import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";

export function FormLabelElement({
	className,
	children,
	...props
}: PlateElementProps) {
	const { editor, element, path } = props;
	const isRequired = element.required as boolean | undefined;
	const placeholder = element.placeholder as string | undefined;
	const isEmpty = editor.api.isEmpty(element);

	const toggleRequired = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		editor.tf.setNodes({ required: !isRequired }, { at: path });
	};

	return (
		<PlateElement
			className={cn(
				"m-0 px-0 py-1 text-sm font-medium text-foreground relative",
				className,
			)}
			{...props}
		>
			<span className="flex items-center gap-1">
				{isEmpty && placeholder && (
					<span className="absolute text-muted-foreground/60 pointer-events-none select-none">
						{placeholder}
					</span>
				)}
				{children}
				{isRequired && (
					<button
						type="button"
						onClick={toggleRequired}
						className={cn(
							"flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground hover:bg-muted-foreground hover:text-muted transition-colors",
							"ml-0.5",
						)}
						contentEditable={false}
					>
						*
					</button>
				)}
			</span>
		</PlateElement>
	);
}
