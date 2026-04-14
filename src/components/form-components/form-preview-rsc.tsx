// Client-side consumer of `getPublicFormViewRSC`. Imports no Plate code — the
// static prose is pre-rendered server-side; only field widgets fill slots.
import { CompositeComponent } from "@tanstack/react-start/rsc";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IconPickerPreview } from "@/components/icon-picker";
import { RenderStepPreviewInput } from "@/components/form-components/render-step-preview-input";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/routes/forms/-components/progress-bar";
import { StepFormProvider, useStepForm } from "@/contexts/step-form-context";
import { useTranslation } from "@/contexts/translation-context";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useStepPreviewForm } from "@/hooks/use-preview-form";
import { DEFAULT_ICON } from "@/lib/config/app-config";
import { CUSTOMIZATION_AUTO_DEFAULTS } from "@/lib/theme/customization-defaults";
import { cn, isValidUrl } from "@/lib/utils";
import type { PlateFormField } from "@/lib/editor/transform-plate-to-form";
import type {
  ButtonGroupSlotProps,
  FieldSlotProps,
} from "@/lib/server-fn/public-form-view-rsc.types";
import type { PublicFormSettings } from "@/types/form-settings";

// `src` is the opaque Composite Component payload; `fields` travels alongside
// so the client can build the TanStack Form instance.
export interface StepRSC {
  src: unknown;
  fields: PlateFormField[];
}

// CompositeComponent's src generic collapses to `never` when the server fn's
// return type doesn't thread through to this file cleanly — local-alias the
// slot prop shape so slot components typecheck.
const TypedComposite = CompositeComponent as unknown as React.ComponentType<{
  src: unknown;
  Field?: React.ComponentType<FieldSlotProps>;
  ButtonGroup?: React.ComponentType<ButtonGroupSlotProps>;
  children?: React.ReactNode;
}>;

interface FormPreviewRSCProps {
  steps: StepRSC[];
  thankYou: unknown | null;
  stepCount: number;
  title?: string;
  icon?: string | null;
  cover?: string | null;
  hideTitle?: boolean;
  settings?: PublicFormSettings;
  formId: string;
  customization?: Record<string, string> | null;
  onSubmit?: (values: Record<string, unknown>) => Promise<void>;
}

const EDITABLE_FIELD_TYPES = new Set([
  "Input",
  "Textarea",
  "Email",
  "Phone",
  "Number",
  "Link",
  "Date",
  "Time",
  "FileUpload",
  "Checkbox",
  "MultiChoice",
  "MultiSelect",
  "Ranking",
]);

const PAGE_MAX_WIDTH = `var(--bf-page-width, ${CUSTOMIZATION_AUTO_DEFAULTS.pageWidth})`;

const selectStateValues = (state: { values: unknown }) => state.values as Record<string, unknown>;

const isHexColor = (str: string): boolean => /^#([0-9A-Fa-f]{3}){1,2}$/.test(str);

const NoContentPlaceholderIcon = (
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
    <title>No content placeholder</title>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

const SuccessCheckmarkIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-green-600"
  >
    <title>Success checkmark</title>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 20 : -20,
    opacity: 0,
  }),
};

const PublicFormHeader = ({
  title,
  icon,
  cover,
  hideTitle,
  customization,
}: {
  title?: string;
  icon?: string | null;
  cover?: string | null;
  hideTitle?: boolean;
  customization?: Record<string, string> | null;
}) => {
  const [imageError, setImageError] = useState(false);
  const [iconError, setIconError] = useState(false);

  const hasCustomization = !!(customization && Object.keys(customization).length > 0);
  const isLogoMinimal =
    hasCustomization && !!customization?.logoWidth && Number.parseInt(customization.logoWidth) <= 0;
  const logoCircleSize =
    hasCustomization && customization?.logoWidth
      ? String(Math.max(48, Number.parseInt(customization.logoWidth)))
      : "100";

  const hasCover = !!cover && (isHexColor(cover) || isValidUrl(cover)) && !imageError;
  const hasIcon = !!icon && !iconError;
  const hasTitle = !!title && title.trim().length > 0 && !hideTitle;

  if (!hasCover && !hasIcon && !hasTitle) return null;

  const coverClass =
    "relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[120px] sm:h-[200px]";

  const renderCover = () => {
    if (!cover) return null;
    if (isHexColor(cover)) {
      return <div className={coverClass} data-bf-cover style={{ backgroundColor: cover }} />;
    }
    if (isValidUrl(cover) && !imageError) {
      return (
        <div className={cn(coverClass, "overflow-hidden bg-muted")} data-bf-cover>
          {cover.includes("tint=true") && (
            <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
          )}
          <img
            src={cover}
            alt="Form cover"
            width={1200}
            height={200}
            className={cn(
              "w-full h-full object-cover",
              cover.includes("tint=true") && "relative z-0 brightness-60 grayscale",
            )}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    return null;
  };

  const iconWrapClass = cn("relative z-10 mb-1", hasCover ? "-mt-[50px]" : "mt-4 sm:mt-6");

  const renderIcon = () => {
    if (!icon) return null;
    if (icon === DEFAULT_ICON) {
      return (
        <div className={iconWrapClass} data-bf-logo-emoji-container={hasCover ? "true" : undefined}>
          <span data-bf-logo-icon={isLogoMinimal ? "minimal" : ""}>
            <IconPickerPreview
              icon={null}
              iconColor={undefined}
              useThemeColor
              iconSize="48"
              size={logoCircleSize}
            />
          </span>
        </div>
      );
    }
    if (isValidUrl(icon) && !iconError) {
      return (
        <div className={iconWrapClass} data-bf-logo-container={hasCover ? "true" : undefined}>
          <img
            src={icon}
            alt="Form icon"
            width={120}
            height={120}
            className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-md object-cover"
            data-bf-logo
            onError={() => setIconError(true)}
          />
        </div>
      );
    }
    return (
      <div className={iconWrapClass} data-bf-logo-emoji-container={hasCover ? "true" : undefined}>
        <span data-bf-logo-icon={isLogoMinimal ? "minimal" : ""}>
          <IconPickerPreview
            icon={icon}
            iconColor={undefined}
            useThemeColor
            iconSize="48"
            size={logoCircleSize}
          />
        </span>
      </div>
    );
  };

  return (
    <div className="mb-4 sm:mb-8 w-full">
      {hasCover && renderCover()}
      <div className="mx-auto px-4" style={{ maxWidth: PAGE_MAX_WIDTH }} data-bf-form-container>
        <div className="flex flex-col">
          {hasIcon && renderIcon()}
          {hasTitle && (
            <h1
              data-bf-title
              style={{ textWrap: "pretty" }}
              className={`text-4xl sm:text-[48px] font-serif font-light -tracking-[0.03em] text-foreground ${hasIcon ? "mt-3 sm:mt-4" : "mt-6 sm:mt-8"}`}
            >
              {title}
            </h1>
          )}
        </div>
      </div>
    </div>
  );
};

const DefaultThankYou = ({ onReset }: { onReset?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        {SuccessCheckmarkIcon}
      </div>
      <h2 className="text-2xl font-bold mb-2">{t("thankYou")}</h2>
      <p className="text-muted-foreground mb-6">{t("responseSubmitted")}</p>
      {onReset && (
        <Button type="button" onClick={onReset} variant="outline" size="sm" className="rounded-lg">
          {t("submitAnother")}
        </Button>
      )}
    </div>
  );
};

const StepButton = ({
  buttonText,
  buttonRole,
  isSubmitting,
  onPrevious,
  grouped = false,
  totalSteps = 1,
}: {
  buttonText: string;
  buttonRole: "next" | "previous" | "submit";
  isSubmitting: boolean;
  onPrevious?: () => void;
  grouped?: boolean;
  totalSteps?: number;
}) => {
  const buttonStyle = { fontSize: "13px" } as const;

  if (buttonRole === "previous") {
    const button = (
      <Button
        type="button"
        onClick={onPrevious}
        style={buttonStyle}
        className="h-8 px-2.5 rounded-lg gap-1.5"
        prefix={<ChevronLeftIcon className="size-4" />}
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

  if (buttonRole === "next") {
    const button = (
      <Button
        type="submit"
        style={buttonStyle}
        className="h-8 px-2.5 rounded-lg gap-1.5"
        suffix={<ChevronRightIcon className="size-4" />}
        disabled={isSubmitting}
      >
        {buttonText}
      </Button>
    );
    return grouped ? (
      button
    ) : (
      <div className="flex justify-end mb-4" style={{ maxWidth: "var(--bf-input-width)" }}>
        {button}
      </div>
    );
  }

  // Submit
  const isMultiStep = totalSteps > 1;
  const submitButton = (
    <Button
      type="submit"
      style={buttonStyle}
      className="h-8 px-2.5 rounded-lg gap-1.5"
      disabled={isSubmitting}
    >
      {buttonText}
    </Button>
  );
  return grouped ? (
    submitButton
  ) : (
    <div
      className={`flex ${isMultiStep ? "justify-end" : "justify-start"}`}
      style={{ maxWidth: "var(--bf-input-width)" }}
    >
      {submitButton}
    </div>
  );
};

const StepFormRSC = ({
  stepIndex,
  stepRSC,
  isLastStep,
  autoJump,
}: {
  stepIndex: number;
  stepRSC: StepRSC;
  isLastStep: boolean;
  autoJump: boolean;
}) => {
  const { currentStep, totalSteps, goToPrevStep, isSubmitting } = useStepForm();
  const { t } = useTranslation();
  const fields = stepRSC.fields;
  const editableFields = useMemo(
    () => fields.filter((f) => EDITABLE_FIELD_TYPES.has(f.fieldType)),
    [fields],
  );

  const { form, formName } = useStepPreviewForm({
    fields,
    stepIndex,
    isLastStep,
    formName: `stepForm-${stepIndex}`,
  });

  const formRef = useRef<HTMLFormElement>(null);
  const autoJumpTriggered = useRef(false);

  useMountEffect(() => {
    const timer = setTimeout(() => {
      if (formRef.current) {
        const focusable = formRef.current.querySelector(
          'input:not([type="hidden"]), textarea, select, [role="checkbox"]',
        ) as HTMLElement;
        if (focusable) focusable.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  });

  const checkAutoJump = useCallback(() => {
    if (!autoJump || isLastStep || autoJumpTriggered.current || isSubmitting) return;

    const allRequiredFilled = editableFields.every((field) => {
      if (!("required" in field) || !field.required) return true;
      const value = form.getFieldValue(field.name as never);
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });

    if (allRequiredFilled && editableFields.length > 0) {
      autoJumpTriggered.current = true;
      setTimeout(() => {
        form.handleSubmit();
      }, 400);
    }
  }, [autoJump, isLastStep, isSubmitting, editableFields, form]);

  const FieldSlot = useCallback(
    ({ fieldId, field }: FieldSlotProps) => {
      if (field.fieldType === "Button") {
        const btn = field as PlateFormField & {
          buttonText?: string;
          buttonRole?: "next" | "previous" | "submit";
        };
        const role = btn.buttonRole ?? "submit";
        const defaultText =
          role === "next" ? t("next") : role === "previous" ? t("previous") : t("submit");
        return (
          <StepButton
            buttonText={
              role === "submit" && isSubmitting ? t("submitting") : btn.buttonText || defaultText
            }
            buttonRole={role}
            isSubmitting={isSubmitting}
            onPrevious={currentStep > 0 ? goToPrevStep : undefined}
            totalSteps={totalSteps}
          />
        );
      }
      return (
        <div key={fieldId} className="w-full">
          <RenderStepPreviewInput element={field} form={form} />
        </div>
      );
    },
    [form, isSubmitting, currentStep, goToPrevStep, totalSteps, t],
  );

  const ButtonGroupSlot = useCallback(
    ({ buttons }: ButtonGroupSlotProps) => {
      const prev = buttons.find((b) => b.buttonRole === "previous");
      const action = buttons.find((b) => b.buttonRole === "next" || b.buttonRole === "submit");
      const actionRole = action?.buttonRole ?? "submit";
      const actionDefaultText =
        actionRole === "next" ? t("next") : actionRole === "previous" ? t("previous") : t("submit");
      const actionText =
        actionRole === "submit" && isSubmitting
          ? t("submitting")
          : action?.buttonText || actionDefaultText;

      return (
        <div
          className="flex flex-row-reverse justify-between items-center w-full"
          style={{ maxWidth: "var(--bf-input-width)" }}
        >
          {action && (
            <StepButton
              buttonText={actionText}
              buttonRole={actionRole}
              isSubmitting={isSubmitting}
              onPrevious={currentStep > 0 ? goToPrevStep : undefined}
              grouped
              totalSteps={totalSteps}
            />
          )}
          {prev ? (
            <StepButton
              buttonText={prev.buttonText || t("previous")}
              buttonRole="previous"
              isSubmitting={isSubmitting}
              onPrevious={currentStep > 0 ? goToPrevStep : undefined}
              grouped
            />
          ) : (
            <div />
          )}
        </div>
      );
    },
    [t, isSubmitting, currentStep, goToPrevStep, totalSteps],
  );

  return (
    <form.AppForm>
      <form.Form
        id={formName}
        ref={formRef}
        noValidate
        data-bf-field-list
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {autoJump && !isLastStep && (
          <form.Subscribe selector={selectStateValues}>
            {() => {
              checkAutoJump();
              return null;
            }}
          </form.Subscribe>
        )}
        <TypedComposite src={stepRSC.src} Field={FieldSlot} ButtonGroup={ButtonGroupSlot} />
      </form.Form>
    </form.AppForm>
  );
};

const FormPreviewRSCContent = ({
  steps,
  thankYou,
  title,
  icon,
  cover,
  hideTitle,
  settings,
  customization,
}: {
  steps: StepRSC[];
  thankYou: unknown | null;
  title?: string;
  icon?: string | null;
  cover?: string | null;
  hideTitle?: boolean;
  settings?: PublicFormSettings;
  customization?: Record<string, string> | null;
}) => {
  const { currentStep, totalSteps, isSubmitted, direction, reset } = useStepForm();
  const { t } = useTranslation();
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!isSubmitted) return;
    if (!settings?.redirectOnCompletion || !settings?.redirectUrl) return;

    const delay = settings.redirectDelay ?? 0;
    if (delay === 0) {
      window.location.href = settings.redirectUrl;
      return;
    }

    setRedirectCountdown(delay);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (settings.redirectUrl) window.location.href = settings.redirectUrl;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, settings?.redirectOnCompletion, settings?.redirectUrl, settings?.redirectDelay]);

  if (isSubmitted) {
    return (
      <div className="w-full">
        <PublicFormHeader
          title={title}
          icon={icon}
          cover={cover}
          hideTitle={hideTitle}
          customization={customization}
        />
        <div
          className="w-full mx-auto px-4"
          style={{ maxWidth: PAGE_MAX_WIDTH }}
          data-bf-form-container
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {thankYou ? (
              <div data-bf-field-list className="space-y-4">
                <TypedComposite src={thankYou} />
                {reset && (
                  <div className="flex justify-center pt-4">
                    <Button
                      type="button"
                      onClick={reset}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                    >
                      {t("submitAnother")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <DefaultThankYou onReset={reset} />
            )}
            {redirectCountdown !== null && (
              <p className="text-muted-foreground text-center mt-4">
                {t("redirecting", {
                  n: redirectCountdown,
                  s: redirectCountdown !== 1 ? "s" : "",
                })}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === steps.length - 1;
  const currentStepRSC = steps[currentStep];

  return (
    <div className="w-full">
      <PublicFormHeader
        title={title}
        icon={icon}
        cover={cover}
        hideTitle={hideTitle}
        customization={customization}
      />

      {settings?.progressBar && totalSteps > 1 && (
        <div
          className="mb-6 mx-auto px-4"
          style={{ maxWidth: PAGE_MAX_WIDTH }}
          data-bf-form-container
        >
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      )}

      <div className="mx-auto px-4" style={{ maxWidth: PAGE_MAX_WIDTH }} data-bf-form-container>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full"
          >
            {currentStepRSC && (
              <StepFormRSC
                key={currentStep}
                stepIndex={currentStep}
                stepRSC={currentStepRSC}
                isLastStep={isLastStep}
                autoJump={settings?.autoJump ?? false}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export const FormPreviewRSC = ({
  steps,
  thankYou,
  stepCount,
  title,
  icon,
  cover,
  hideTitle,
  settings,
  formId,
  customization,
  onSubmit,
}: FormPreviewRSCProps) => {
  if (steps.length === 0 || stepCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <div className="text-muted-foreground mb-4">{NoContentPlaceholderIcon}</div>
        <h3 className="text-lg mb-2">No Content Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Add content to the editor to see the preview.
        </p>
      </div>
    );
  }

  return (
    <StepFormProvider
      totalSteps={stepCount}
      onSubmit={onSubmit}
      formId={formId}
      saveAnswersForLater={settings?.saveAnswersForLater}
    >
      <FormPreviewRSCContent
        steps={steps}
        thankYou={thankYou}
        title={title}
        icon={icon}
        cover={cover}
        hideTitle={hideTitle}
        settings={settings}
        customization={customization}
      />
    </StepFormProvider>
  );
};
