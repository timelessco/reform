'use client';

import type { PlateElementProps } from 'platejs/react';

import { PlateElement } from 'platejs/react';

import { cn } from '@/lib/utils';

export function FormLabelElement({
    className,
    children,
    ...props
}: PlateElementProps) {
    const isRequired = props.element.required as boolean | undefined;
    const placeholder = props.element.placeholder as string | undefined;
    const isEmpty = props.editor.api.isEmpty(props.element);

    return (
        <PlateElement
            className={cn(
                'm-0 px-0 py-1 text-sm font-medium text-foreground relative',
                className
            )}
            {...props}
        >
            <span className="flex items-center gap-0.5">
                {isEmpty && placeholder && (
                    <span className="absolute text-muted-foreground/60 pointer-events-none select-none">
                        {placeholder}
                    </span>
                )}
                {children}
                {isRequired && (
                    <span className="text-destructive ml-0.5 select-none">*</span>
                )}
            </span>
        </PlateElement>
    );
}
