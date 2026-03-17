import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useStepForm } from "@/contexts/step-form-context";
import { useTranslation } from "@/contexts/translation-context";
import { useStepPreviewForm } from "@/hooks/use-preview-form";
import {
  getEditableFieldsFromSegments,
  getFieldsFromSegments,
} from "@/lib/transform-plate-for-preview";
import type { PreviewSegment } from "@/lib/transform-plate-for-preview";
import { StaticContentBlock } from "./static-content-block";
import { RenderStepPreviewInput } from "./render-step-preview-input";

interface StepFormProps {
  stepIndex: number;
  segments: PreviewSegment[];
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
  segments,
  isLastStep,
  layout = "public",
  autoJump = false,
}: StepFormProps) {
  const { currentStep, goToPrevStep, isSubmitting } = useStepForm();
  const fields = useMemo(() => getFieldsFromSegments(segments), [segments]);
  const editableFields = useMemo(() => getEditableFieldsFromSegments(segments), [segments]);

  const { form, formName } = useStepPreviewForm({
    fields,
    stepIndex,
    isLastStep,
    formName: `stepForm-${stepIndex}`,
  });

  // Group segments for rendering (combine adjacent buttons)
  const groupedItems = useMemo(() => groupSegmentsForRendering(segments), [segments]);

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
    const allRequiredFilled = editableFields.every((field) => {
      if (!("required" in field) || !field.required) return true;
      const value = form.getFieldValue(field.name as never);
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });

    if (allRequiredFilled && editableFields.length > 0) {
      autoJumpTriggered.current = true;
      // Short delay to let the user see their selection
      setTimeout(() => {
        form.handleSubmit();
      }, 400);
    }
  }, [autoJump, isLastStep, isSubmitting, editableFields, form]);

  return (
    <form.AppForm>
      <form.Form
        id={formName}
        ref={formRef}
        noValidate
        data-bf-field-list
        className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Auto-jump watcher */}
        {autoJump && !isLastStep && (
          <form.Subscribe selector={(state) => state.values}>
            {() => {
              checkAutoJump();
              return null;
            }}
          </form.Subscribe>
        )}
        {groupedItems.map((item, idx) => {
          // Handle button groups (Previous + Next/Submit on same line)
          if (item.type === "buttonGroup") {
            const prevButton = item.buttons.find((b) => b.buttonRole === "previous");
            const actionButton = item.buttons.find(
              (b) => b.buttonRole === "next" || b.buttonRole === "submit",
            );

            const groupKey = `button-group-${item.buttons.map((b) => b.id).join("-")}`;

            return (
              <div
                key={groupKey}
                className="flex flex-row-reverse justify-between items-center w-full"
                style={{ maxWidth: "var(--bf-input-width)" }}
              >
                {actionButton && (
                  <RenderStepButton
                    field={actionButton}
                    isSubmitting={isSubmitting}
                    onPrevious={currentStep > 0 ? goToPrevStep : undefined}
                    grouped
                    layout={layout}
                  />
                )}
                {prevButton ? (
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

          // Static segment — render via PlateStatic
          if (item.type === "static") {
            return <StaticContentBlock key={`static-${idx}`} nodes={item.nodes} />;
          }

          // Field segment
          if (item.type === "field") {
            const { field } = item;

            // Handle button separately
            if (field.fieldType === "Button") {
              return (
                <RenderStepButton
                  key={field.id}
                  field={field}
                  isSubmitting={isSubmitting}
                  onPrevious={currentStep > 0 ? goToPrevStep : undefined}
                  layout={layout}
                />
              );
            }

            // Input/Textarea — delegate to existing renderer
            return (
              <div key={field.id} className="w-full">
                <RenderStepPreviewInput element={field} form={form} />
              </div>
            );
          }

          return null;
        })}
      </form.Form>
    </form.AppForm>
  );
}

// --- Grouping logic ---

type ButtonField = {
  id: string;
  name: string;
  fieldType: "Button";
  buttonText?: string;
  buttonRole: "next" | "previous" | "submit";
};

type GroupedSegment = PreviewSegment | { type: "buttonGroup"; buttons: ButtonField[] };

/**
 * Groups segments for rendering, combining adjacent button FieldSegments into groups.
 */
function groupSegmentsForRendering(segments: PreviewSegment[]): GroupedSegment[] {
  const result: GroupedSegment[] = [];
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    // Check if this is a button field segment
    if (seg.type === "field" && seg.field.fieldType === "Button") {
      const buttons: ButtonField[] = [seg.field as ButtonField];

      // Collect consecutive button segments
      while (i + 1 < segments.length) {
        const next = segments[i + 1];
        if (next.type === "field" && next.field.fieldType === "Button") {
          i++;
          buttons.push(next.field as ButtonField);
        } else {
          break;
        }
      }

      // If multiple buttons, group them; otherwise keep single
      if (buttons.length > 1) {
        result.push({ type: "buttonGroup", buttons });
      } else {
        result.push(seg);
      }
    } else {
      result.push(seg);
    }
    i++;
  }

  return result;
}

// --- Button renderer ---

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
  const { t } = useTranslation();
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
        prefix={<ChevronLeftIcon className="h-4 w-4" />}
      >
        {buttonText}
      </Button>
    );
    return grouped ? (
      button
    ) : (
      <div className="flex justify-start" style={{ maxWidth: "var(--bf-input-width)" }}>
        {button}
      </div>
    );
  }

  // Next button - type="submit" triggers form validation and onSubmit
  if (buttonRole === "next") {
    const button = (
      <Button
        type="submit"
        suffix={<ChevronRightIcon className="h-4 w-4" />}
        disabled={isSubmitting}
      >
        {buttonText}
      </Button>
    );
    return grouped ? (
      button
    ) : (
      <div className="flex justify-end" style={{ maxWidth: "var(--bf-input-width)" }}>
        {button}
      </div>
    );
  }

  // Submit button - type="submit" triggers form validation and final submit
  const submitButton = (
    <Button
      type="submit"
      suffix={layout !== "editor" ? <ChevronRightIcon className="h-4 w-4" /> : undefined}
      disabled={isSubmitting}
    >
      {isSubmitting ? t("submitting") : buttonText}
    </Button>
  );
  return grouped ? (
    submitButton
  ) : (
    <div className="flex justify-end" style={{ maxWidth: "var(--bf-input-width)" }}>
      {submitButton}
    </div>
  );
}
