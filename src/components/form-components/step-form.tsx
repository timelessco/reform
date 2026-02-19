import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useStepForm } from "@/contexts/step-form-context";
import { useTranslation } from "@/contexts/translation-context";
import { useStepPreviewForm } from "@/hooks/use-preview-form";
import { getEditableFields, type TransformedElement } from "@/lib/transform-plate-to-form";
import { RenderStepPreviewInput } from "./render-step-preview-input";

interface StepFormProps {
  stepIndex: number;
  elements: TransformedElement[];
  isLastStep: boolean;
  layout?: "public" | "editor";
  autoJump?: boolean;
}

/**
 * Individual step form component with its own form instance.
 * Uses StepFormContext for navigation and data accumulation.
 */
export function StepForm({
  stepIndex,
  elements,
  isLastStep,
  layout = "public",
  autoJump = false,
}: StepFormProps) {
  const { currentStep, goToPrevStep, isSubmitting } = useStepForm();
  const fields = getEditableFields(elements);

  const { form, formName } = useStepPreviewForm({
    fields,
    stepIndex,
    isLastStep,
    formName: `stepForm-${stepIndex}`,
  });

  // Group elements for rendering (combine adjacent buttons)
  const groupedElements = groupElementsForRendering(elements);

  const formRef = useRef<HTMLFormElement>(null);
  const autoJumpTriggered = useRef(false);

  // Auto-focus the first focusable element on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formRef.current) {
        const focusable = formRef.current.querySelector(
          'input:not([type="hidden"]), textarea, select, [role="checkbox"]',
        ) as HTMLElement;
        if (focusable) {
          focusable.focus();
        }
      }
    }, 300); // Wait for transition to settle

    return () => clearTimeout(timer);
  }, []);

  // Auto-jump: check if all required fields are filled and auto-submit
  const checkAutoJump = useCallback(() => {
    if (!autoJump || isLastStep || autoJumpTriggered.current || isSubmitting) return;

    // Check if all required fields have values
    const allRequiredFilled = fields.every((field) => {
      if (!field.required) return true;
      const value = form.getFieldValue(field.name as never);
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });

    if (allRequiredFilled && fields.length > 0) {
      autoJumpTriggered.current = true;
      // Short delay to let the user see their selection
      setTimeout(() => {
        form.handleSubmit();
      }, 400);
    }
  }, [autoJump, isLastStep, isSubmitting, fields, form]);

  return (
    <form.AppForm>
      <form.Form id={formName} ref={formRef} noValidate className="space-y-4 outline-none">
        {/* Auto-jump watcher */}
        {autoJump && !isLastStep && (
          <form.Subscribe selector={(state) => state.values}>
            {() => {
              checkAutoJump();
              return null;
            }}
          </form.Subscribe>
        )}
        {groupedElements.map((item) => {
          // Handle button groups (Previous + Next/Submit on same line)
          if ("type" in item && item.type === "buttonGroup") {
            const prevButton = item.buttons.find((b) => {
              return b.fieldType === "Button" && b.buttonRole === "previous";
            });
            const actionButton = item.buttons.find((b) => {
              if (b.fieldType !== "Button") return false;
              const role = b.buttonRole;
              return role === "next" || role === "submit";
            });

            const groupKey = `button-group-${item.buttons.map((b) => b.id).join("-")}`;

            return (
              <div
                key={groupKey}
                className="flex flex-row-reverse justify-between items-center w-full"
              >
                {actionButton && actionButton.fieldType === "Button" && (
                  <RenderStepButton
                    field={actionButton}
                    isSubmitting={isSubmitting}
                    onPrevious={currentStep > 0 ? goToPrevStep : undefined}
                    grouped
                    layout={layout}
                  />
                )}
                {prevButton && prevButton.fieldType === "Button" ? (
                  <RenderStepButton
                    field={prevButton}
                    isSubmitting={isSubmitting}
                    onPrevious={currentStep > 0 ? goToPrevStep : undefined}
                    grouped
                    layout={layout}
                  />
                ) : (
                  <div /> // Spacer for justify-between
                )}
              </div>
            );
          }

          // Regular element
          const element = item as TransformedElement;

          // Handle button separately
          if (element.fieldType === "Button") {
            return (
              <RenderStepButton
                key={element.id}
                field={element}
                isSubmitting={isSubmitting}
                onPrevious={currentStep > 0 ? goToPrevStep : undefined}
                layout={layout}
              />
            );
          }

          return (
            <div key={element.id} className="w-full">
              <RenderStepPreviewInput element={element} form={form} />
            </div>
          );
        })}
      </form.Form>
    </form.AppForm>
  );
}

/**
 * Groups elements for rendering, combining adjacent buttons into groups
 */
function groupElementsForRendering(
  elements: TransformedElement[],
): Array<TransformedElement | { type: "buttonGroup"; buttons: TransformedElement[] }> {
  const result: Array<TransformedElement | { type: "buttonGroup"; buttons: TransformedElement[] }> =
    [];
  let i = 0;

  while (i < elements.length) {
    const element = elements[i];

    // Check if this is a button
    if (element.fieldType === "Button") {
      const buttons: TransformedElement[] = [element];

      // Collect consecutive buttons
      while (i + 1 < elements.length && elements[i + 1].fieldType === "Button") {
        i++;
        buttons.push(elements[i]);
      }

      // If multiple buttons, group them; otherwise keep single
      if (buttons.length > 1) {
        result.push({ type: "buttonGroup", buttons });
      } else {
        result.push(element);
      }
    } else {
      result.push(element);
    }
    i++;
  }

  return result;
}

/**
 * Button field type extracted from PlateFormField union
 */
type ButtonField = {
  id: string;
  name: string;
  fieldType: "Button";
  buttonText?: string;
  buttonRole: "next" | "previous" | "submit";
};

/**
 * Renders button elements for step forms.
 * Previous uses onClick, Next/Submit use type="submit" to trigger form validation.
 */
function RenderStepButton({
  field,
  isSubmitting,
  onPrevious,
  grouped = false,
  layout = "public",
}: {
  field: ButtonField;
  isSubmitting: boolean;
  onPrevious?: () => void;
  grouped?: boolean;
  layout?: "public" | "editor";
}) {
  const { totalSteps } = useStepForm();
  const { t } = useTranslation();
  const isSinglePage = totalSteps === 1;
  const buttonRole = field.buttonRole || "submit";
  const defaultText =
    buttonRole === "next" ? t("next") : buttonRole === "previous" ? t("previous") : t("submit");
  const buttonText = field.buttonText || defaultText;

  // Previous button - onClick handler from context
  if (buttonRole === "previous") {
    const button = (
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        className="inline-flex items-center gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        {buttonText}
      </Button>
    );
    return grouped ? button : <div className="flex justify-start">{button}</div>;
  }

  // Next button - type="submit" triggers form validation and onSubmit
  if (buttonRole === "next") {
    const button = (
      <Button type="submit" className="inline-flex items-center gap-2" disabled={isSubmitting}>
        {buttonText}
        <ChevronRight className="h-4 w-4" />
      </Button>
    );
    return grouped ? button : <div className="flex justify-end">{button}</div>;
  }

  // Submit button - type="submit" triggers form validation and final submit
  const submitButton = (
    <Button type="submit" className="inline-flex items-center gap-2" disabled={isSubmitting}>
      {isSubmitting ? t("submitting") : buttonText}
      {layout !== "editor" && <ChevronRight className="h-4 w-4" />}
    </Button>
  );
  return grouped ? (
    submitButton
  ) : (
    <div className={`flex ${isSinglePage ? "justify-start" : "justify-end"}`}>{submitButton}</div>
  );
}
