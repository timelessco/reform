import * as React from "react";
import { useFormPersistence } from "@/hooks/use-form-persistence";
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

function useStepFormSafe() {
  return React.useContext(StepFormContext);
}

interface StepFormProviderProps {
  children: React.ReactNode;
  totalSteps: number;
  thankYouContent?: TransformedElement[] | null;
  onSubmit?: (data: Record<string, unknown>) => Promise<void>;
  /** Form ID for localStorage key */
  formId?: string;
  /** Enable auto-save to localStorage */
  saveAnswersForLater?: boolean;
}

export function StepFormProvider({
  children,
  totalSteps,
  onSubmit,
  formId = "",
  saveAnswersForLater = false,
}: StepFormProviderProps) {
  const { loadSavedData, saveData, clearSavedData } = useFormPersistence(
    formId,
    saveAnswersForLater,
  );

  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [formData, setFormData] = React.useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Load saved data on mount
  React.useEffect(() => {
    if (!isInitialized) {
      const savedData = loadSavedData();
      if (savedData) {
        setFormData(savedData);
      }
      setIsInitialized(true);
    }
  }, [loadSavedData, isInitialized]);

  // Save data whenever formData changes (after initialization)
  React.useEffect(() => {
    if (isInitialized && Object.keys(formData).length > 0) {
      saveData(formData);
    }
  }, [formData, saveData, isInitialized]);

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
        // Clear saved data on successful submission
        clearSavedData();
        setIsSubmitted(true);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, clearSavedData],
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

  return (
    <StepFormContext.Provider value={value}>
      {children}
    </StepFormContext.Provider>
  );
}
