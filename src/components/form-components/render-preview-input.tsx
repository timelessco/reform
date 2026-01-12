

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
 * Extracts error message from Zod/TanStack Form error object
 */
function extractErrorMessage(error: unknown): string {
    if (!error) return 'Invalid value';

    // Handle array of errors
    if (Array.isArray(error)) {
        return extractErrorMessage(error[0]);
    }

    // Handle object with message property
    if (typeof error === 'object' && error !== null) {
        if ('message' in error && typeof error.message === 'string') {
            return error.message;
        }
    }

    // Handle string error
    if (typeof error === 'string') {
        return error;
    }

    return 'Invalid value';
}

/**
 * Renders a single input field in the preview form.
 * This is a simplified version that only handles Input fields.
 */
export function RenderPreviewInput({ field, form }: RenderPreviewInputProps) {
    return (
        <form.AppField name={field.name}>
            {(f) => {
                const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
                const errorMessage = hasErrors
                    ? extractErrorMessage(f.state.meta.errors[0])
                    : '';

                return (
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
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            aria-invalid={hasErrors}
                            className={hasErrors ? 'border-destructive' : ''}
                        />
                        {hasErrors && (
                            <p className="text-sm text-destructive">
                                {errorMessage}
                            </p>
                        )}
                    </div>
                );
            }}
        </form.AppField>
    );
}

