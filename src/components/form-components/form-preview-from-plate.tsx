

/**
 * FormPreviewFromPlate - Renders a functional form preview from Plate editor content.
 * 
 * This component transforms Plate.js editor state into an interactive form
 * with TanStack Form integration for validation and submission.
 */
import { useState } from 'react';
import type { Value } from 'platejs';
import { RenderPreviewInput } from '@/components/form-components/render-preview-input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePreviewForm } from '@/hooks/use-preview-form';
import {
    transformPlateStateToFormElements,
    getEditableFields,
    type TransformedElement,
    type PlateFormField
} from '@/lib/transform-plate-to-form';

interface FormPreviewFromPlateProps {
    /** Plate editor content array */
    content: Value;
    /** Optional form title to display */
    title?: string;
    /** Optional icon emoji, URL, or 'default-icon' */
    icon?: string;
    /** Optional cover image URL or hex color code */
    cover?: string;
}

/**
 * Checks if a string is likely an emoji (starts with emoji unicode range)
 */
function isEmoji(str: string): boolean {
    if (!str) return false;
    // Check if it's a short string that's likely an emoji
    const emojiRange = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    return str.length <= 4 && emojiRange.test(str);
}

/**
 * Checks if a string is a hex color code
 */
function isHexColor(str: string): boolean {
    return /^#([0-9A-Fa-f]{3}){1,2}$/.test(str);
}

/**
 * Checks if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
    if (!str) return false;
    try {
        new URL(str);
        return true;
    } catch {
        // Also check for relative paths starting with /
        return str.startsWith('/') || str.startsWith('http') || str.startsWith('blob:');
    }
}

/**
 * Default hexagon icon SVG (matches the editor's form-header.tsx)
 */
function DefaultIcon() {
    return (
        <div className="w-[80px] h-[80px] rounded-full overflow-hidden shadow-sm bg-black flex items-center justify-center text-white">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
            </svg>
        </div>
    );
}

/**
 * Renders a single preview element (static or input)
 */
function RenderPreviewElement({
    element,
    form
}: {
    element: TransformedElement;
    form: ReturnType<typeof usePreviewForm>['form'];
}) {
    // Static elements
    if ('static' in element && element.static) {
        switch (element.fieldType) {
            case 'H1':
                return <h1 className="text-3xl font-bold mt-6 mb-4">{element.content}</h1>;
            case 'H2':
                return <h2 className="text-2xl font-semibold mt-5 mb-3">{element.content}</h2>;
            case 'H3':
                return <h3 className="text-xl font-medium mt-4 mb-2">{element.content}</h3>;
            case 'Separator':
                return <Separator className="my-4" />;
            case 'EmptyBlock':
                return <div className="h-6" aria-hidden="true" />; // Empty spacer
            case 'FieldDescription':
                return <p className="text-muted-foreground text-sm my-2">{element.content}</p>;
            default:
                return null;
        }
    }

    // Input fields
    if (element.fieldType === 'Input') {
        return <RenderPreviewInput field={element as PlateFormField} form={form} />;
    }

    return null;
}

/**
 * Form header component with proper icon and cover handling
 * Matches the editor's form-header.tsx rendering patterns
 */
function PreviewFormHeader({
    title,
    icon,
    cover
}: {
    title?: string;
    icon?: string;
    cover?: string;
}) {
    const [imageError, setImageError] = useState(false);
    const [iconError, setIconError] = useState(false);

    // Check if we have valid cover (URL or hex color)
    const hasCover = cover && (isHexColor(cover) || isValidUrl(cover)) && !imageError;
    const hasIcon = !!icon && !iconError;
    const hasTitle = title && title.trim().length > 0;

    if (!hasCover && !hasIcon && !hasTitle) {
        return null;
    }

    // Render cover - can be image or solid color
    const renderCover = () => {
        if (!cover) return null;

        if (isHexColor(cover)) {
            // Render as solid color background
            return (
                <div
                    className="w-full h-[200px] mb-4 rounded-lg"
                    style={{ backgroundColor: cover }}
                />
            );
        }

        if (isValidUrl(cover) && !imageError) {
            // Render as image
            return (
                <div className="w-full h-[200px] mb-4 rounded-lg overflow-hidden bg-muted">
                    <img
                        src={cover}
                        alt="Form cover"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                </div>
            );
        }

        return null;
    };

    // Render icon - can be default-icon, emoji, or image URL
    const renderIcon = () => {
        if (!icon) return null;

        // Handle 'default-icon' - render hexagon
        if (icon === 'default-icon') {
            return (
                <div className={hasCover ? "-mt-[40px] relative z-10" : ""}>
                    <DefaultIcon />
                </div>
            );
        }

        // Handle emoji
        if (isEmoji(icon)) {
            return (
                <span className="text-5xl" role="img" aria-label="Form icon">
                    {icon}
                </span>
            );
        }

        // Handle image URL
        if (isValidUrl(icon) && !iconError) {
            return (
                <div className={hasCover ? "-mt-[40px] relative z-10" : ""}>
                    <div className="w-[80px] h-[80px] rounded-full overflow-hidden shadow-sm bg-background">
                        <img
                            src={icon}
                            alt="Form icon"
                            className="w-full h-full object-cover"
                            onError={() => setIconError(true)}
                        />
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="mb-8">
            {/* Cover (image or solid color) */}
            {hasCover && renderCover()}

            {/* Icon and Title */}
            <div className="flex flex-col">
                {hasIcon && renderIcon()}
                {hasTitle && (
                    <h1 className={`text-3xl font-bold ${hasIcon ? 'mt-4' : ''}`}>{title}</h1>
                )}
            </div>
        </div>
    );
}

/**
 * Renders Plate editor content as a functional form preview.
 */
export function FormPreviewFromPlate({
    content,
    title,
    icon,
    cover
}: FormPreviewFromPlateProps) {
    // Transform Plate nodes into form elements
    const elements = transformPlateStateToFormElements(content);

    // Get only editable fields for TanStack Form
    const editableFields = getEditableFields(elements);

    // Create TanStack Form instance
    const { form, formName } = usePreviewForm({ fields: editableFields });

    // Show placeholder if no elements found
    if (elements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
                <div className="text-muted-foreground mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-4 opacity-50"
                    >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No Content Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    Add content to the editor to see the preview.
                </p>
            </div>
        );
    }

    // Check if there are any editable fields for the submit button
    const hasEditableFields = editableFields.length > 0;

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Header Section */}
            <PreviewFormHeader title={title} icon={icon} cover={cover} />

            {/* Form */}
            <form.AppForm>
                <form.Form id={formName} noValidate className="space-y-4">
                    {elements.map((element) => (
                        <div key={element.id} className="w-full">
                            <RenderPreviewElement element={element} form={form} />
                        </div>
                    ))}

                    {/* Submit Button - only show if there are editable fields */}
                    {hasEditableFields && (
                        <div className="flex items-center justify-end w-full pt-4 gap-3">
                            <Button
                                type="button"
                                onClick={() => form.reset()}
                                className="rounded-lg"
                                variant="outline"
                                size="sm"
                            >
                                Reset
                            </Button>
                            <Button type="submit" className="rounded-lg" size="sm">
                                {form.baseStore?.state?.isSubmitting
                                    ? 'Submitting...'
                                    : form.baseStore?.state?.isSubmitted
                                        ? 'Submitted'
                                        : 'Submit'}
                            </Button>
                        </div>
                    )}
                </form.Form>
            </form.AppForm>
        </div>
    );
}
