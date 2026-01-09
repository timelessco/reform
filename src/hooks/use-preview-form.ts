/**
 * Preview form hook for rendering Plate editor content as a functional form.
 * 
 * This is a simplified version of useFormBuilder that takes transformed 
 * form fields directly instead of reading from useFormBuilderState.
 */
import { useMemo } from 'react';
import { toast } from 'sonner';
import { revalidateLogic, useAppForm } from '@/components/ui/tanstack-form';
import type { PlateFormField } from '@/lib/transform-plate-to-form';
import type { AppForm } from './use-form-builder';

interface UsePreviewFormOptions {
  fields: PlateFormField[];
  formName?: string;
}

/**
 * Creates a TanStack Form instance for previewing form fields.
 * 
 * @param options.fields - Array of form fields from Plate state transformation
 * @param options.formName - Optional form name/id for the form element
 * @returns Form instance compatible with AppForm type
 */
export function usePreviewForm({ fields, formName = 'previewForm' }: UsePreviewFormOptions): {
  form: AppForm;
  formName: string;
} {
  // Generate default values from fields
  const defaultValues = useMemo(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of fields) {
      defaults[field.name] = '';
    }
    return defaults;
  }, [fields]);

  const form = useAppForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      try {
        // Log form values for debugging
        console.log('Form submitted with values:', value);
        
        // Simulate async submission
        await new Promise((resolve) => setTimeout(resolve, 500));
        toast.success('Form submitted successfully!');
      } catch (_error) {
        toast.error('Failed to submit form. Please try again.');
      }
    },
    canSubmitWhenInvalid: false,
    onSubmitInvalid({ formApi }) {
      try {
        const errorMap = formApi.state.errorMap['onDynamic'];
        const inputs = Array.from(
          document.querySelectorAll(`#${formName} input`),
        ) as HTMLInputElement[];

        let firstInput: HTMLInputElement | undefined;
        for (const input of inputs) {
          if (errorMap?.[input.name]) {
            firstInput = input;
            break;
          }
        }
        firstInput?.focus();
      } catch (_error) {
        // Silently handle error
      }
    },
  });

  return { form: form as unknown as AppForm, formName };
}
