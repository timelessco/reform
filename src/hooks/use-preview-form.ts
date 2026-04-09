/**
 * Preview form hook for rendering Plate editor content as a functional form.
 *
 * This is a simplified version of useFormBuilder that takes transformed
 * form fields directly instead of reading from useFormBuilderState.
 */
import { useMemo } from "react";
import { toast } from "sonner";
import { revalidateLogic, useAppForm } from "@/components/ui/tanstack-form";
import { useStepForm } from "@/contexts/step-form-context";
import {
  generateDefaultValuesFromFields,
  generateZodSchemaFromFields,
} from "@/lib/form-schema/generate-preview-schema";
import type { PlateFormField } from "@/lib/editor/transform-plate-to-form";
import { logger } from "@/lib/utils";
import type { AppForm } from "./use-form-builder";

interface UsePreviewFormOptions {
  fields: PlateFormField[];
  formName?: string;
  /** Optional custom submit handler - if provided, replaces default toast behavior */
  onSubmit?: (values: Record<string, unknown>) => Promise<void>;
}

/**
 * Creates a TanStack Form instance for previewing form fields.
 *
 * @param options.fields - Array of form fields from Plate state transformation
 * @param options.formName - Optional form name/id for the form element
 * @returns Form instance compatible with AppForm type
 */
export const usePreviewForm = ({
  fields,
  formName = "previewForm",
  onSubmit: customOnSubmit,
}: UsePreviewFormOptions): {
  form: AppForm;
  formName: string;
} => {
  // Generate Zod schema from field validation properties
  const validationSchema = useMemo(() => generateZodSchemaFromFields(fields), [fields]);

  // Generate default values from fields (uses defaultValue if specified)
  const defaultValues = useMemo(() => generateDefaultValuesFromFields(fields), [fields]);

  const form = useAppForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: validationSchema,
      onDynamicAsyncDebounceMs: 300,
    },
    onSubmit: async ({ value }) => {
      // Log form values for debugging
      logger("Form submitted with values:", value);

      // Use custom handler if provided, otherwise default behavior
      if (customOnSubmit) {
        await customOnSubmit(value);
      } else {
        // Default: simulate async submission
        await new Promise((resolve) => setTimeout(resolve, 500));
        toast.success("Form submitted successfully!");
      }
    },
    canSubmitWhenInvalid: false,
    onSubmitInvalid({ formApi }) {
      try {
        const errorMap = formApi.state.errorMap.onDynamic;
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
      } catch {
        // Silently handle error
      }
    },
  });

  return { form: form as unknown as AppForm, formName };
};

interface UseStepPreviewFormOptions {
  fields: PlateFormField[];
  stepIndex: number;
  isLastStep: boolean;
  formName?: string;
}

/**
 * Creates a TanStack Form instance for a single step in a multi-step form.
 * Uses StepFormContext for navigation and data accumulation.
 */
export const useStepPreviewForm = ({
  fields,
  stepIndex,
  isLastStep,
  formName = "stepPreviewForm",
}: UseStepPreviewFormOptions): {
  form: AppForm;
  formName: string;
} => {
  const { formData, goToNextStep, submitForm } = useStepForm();

  // Generate Zod schema from step's field validation properties
  const validationSchema = useMemo(() => generateZodSchemaFromFields(fields), [fields]);

  // Generate default values, merging with existing formData from context
  const defaultValues = useMemo(() => {
    const fieldDefaults = generateDefaultValuesFromFields(fields);
    // Merge context data (for when user goes back to previous step)
    const merged: Record<string, unknown> = { ...fieldDefaults };
    for (const field of fields) {
      if (field.name in formData) {
        merged[field.name] = formData[field.name];
      }
    }
    return merged;
  }, [fields, formData]);

  const form = useAppForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: validationSchema,
      onDynamicAsyncDebounceMs: 300,
    },
    onSubmit: async ({ value }) => {
      try {
        logger(`Step ${stepIndex + 1} submitted with values:`, value);

        if (isLastStep) {
          await submitForm(value);
        } else {
          goToNextStep(value);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to process step. Please try again.";
        toast.error(message);
        throw error;
      }
    },
    canSubmitWhenInvalid: false,
    onSubmitInvalid({ formApi }) {
      try {
        const errorMap = formApi.state.errorMap.onDynamic;
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
      } catch {
        // Silently handle error
      }
    },
  });

  return { form: form as unknown as AppForm, formName };
};
