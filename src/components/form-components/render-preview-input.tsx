'use client';

/**
 * Simplified input field renderer for form preview.
 * Only handles Input fields to avoid dependencies on missing components.
 */
import type { PlateFormField } from '@/lib/transform-plate-to-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AppForm } from '@/hooks/use-form-builder';

interface RenderPreviewInputProps {
    field: PlateFormField;
    form: AppForm;
}

/**
 * Renders a single input field in the preview form.
 * This is a simplified version that only handles Input fields.
 */
export function RenderPreviewInput({ field, form }: RenderPreviewInputProps) {
    return (
        <form.AppField name={field.name}>
            {(f) => (
                <div className="space-y-2">
                    <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && (
                            <span className="text-destructive ml-0.5">*</span>
                        )}
                    </Label>
                    <Input
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        value={(f.state.value as string | undefined) ?? ''}
                        onChange={(e) => f.handleChange(e.target.value)}
                        onBlur={f.handleBlur}
                        aria-invalid={!!f.state.meta.errors.length && f.state.meta.isTouched}
                        className={
                            !!f.state.meta.errors.length && f.state.meta.isTouched
                                ? 'border-destructive'
                                : ''
                        }
                    />
                    {f.state.meta.errors.length > 0 && f.state.meta.isTouched && (
                        <p className="text-sm text-destructive">
                            {String((f.state.meta.errors[0] as unknown as { message?: string })?.message ?? f.state.meta.errors[0] ?? 'Invalid value')}
                        </p>
                    )}
                </div>
            )}
        </form.AppField>
    );
}
