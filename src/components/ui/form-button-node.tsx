import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

export function FormButtonElement({
    className,
    children,
    ...props
}: PlateElementProps) {
    const buttonText = props.element.buttonText as string | undefined;
    const isEmpty = props.editor.api.isEmpty(props.element);

    return (
        <PlateElement className={cn("m-0 px-0 py-1", className)} {...props}>
            <button
                type="button"
                className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors",
                    "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:pointer-events-none disabled:opacity-50",
                )}
            >
                {isEmpty && !buttonText && (
                    <span className="text-primary-foreground/70">Button</span>
                )}
                {buttonText || (!isEmpty && children)}
                {!buttonText && isEmpty && (
                    <span className="opacity-0">{children}</span>
                )}
            </button>
        </PlateElement>
    );
}
