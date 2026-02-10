import * as React from "react";
import type { TransformedElement } from "@/lib/transform-plate-to-form";

type StepFormContextValue = {
  currentStep: number;
  totalSteps: number;
  formData: Record<string, unknown>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  goToNextStep: (stepData: Record<string, unknown>) => void;
  goToPrevStep: () => void;
  direction: number;
  submitForm: (finalStepData: Record<string, unknown>) => Promise<void>;
  reset: () => void;
};

const StepFormContext = React.createContext<StepFormContextValue | null>(null);

export function useStepForm() {
  const context = React.useContext(StepFormContext);
  if (!context) {
    throw new Error("useStepForm must be used within a StepFormProvider.");
  }
  return context;
}

export function useStepFormSafe() {
  return React.useContext(StepFormContext);
}

interface StepFormProviderProps {
  children: React.ReactNode;
  totalSteps: number;
  thankYouContent?: TransformedElement[] | null;
  onSubmit?: (data: Record<string, unknown>) => Promise<void>;
}

export function StepFormProvider({ children, totalSteps, onSubmit }: StepFormProviderProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const goToNextStep = React.useCallback(
    (stepData: Record<string, unknown>) => {
      setFormData((prev) => ({ ...prev, ...stepData }));
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    },
    [totalSteps],
  );

  const goToPrevStep = React.useCallback(() => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const submitForm = React.useCallback(
    async (finalStepData: Record<string, unknown>) => {
      const allData = { ...formData, ...finalStepData };
      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(allData);
        }
        setIsSubmitted(true);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit],
  );

  const reset = React.useCallback(() => {
    setCurrentStep(0);
    setDirection(0);
    setFormData({});
    setIsSubmitting(false);
    setIsSubmitted(false);
  }, []);

  const value = React.useMemo<StepFormContextValue>(
    () => ({
      currentStep,
      totalSteps,
      formData,
      isSubmitting,
      isSubmitted,
      goToNextStep,
      goToPrevStep,
      direction,
      submitForm,
      reset,
    }),
    [
      currentStep,
      totalSteps,
      formData,
      isSubmitting,
      isSubmitted,
      goToNextStep,
      goToPrevStep,
      direction,
      submitForm,
      reset,
    ],
  );

  return <StepFormContext.Provider value={value}>{children}</StepFormContext.Provider>;
}
