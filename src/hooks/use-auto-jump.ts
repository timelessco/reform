import { useCallback } from "react";

/**
 * Hook for auto-jumping to the next field after selection.
 * Currently a placeholder - will be fully implemented when
 * radio/select field types are added to the form builder.
 */
export const useAutoJump = (enabled: boolean, onAdvance: () => void) => {
  /**
   * Call this when a single-select field is answered.
   * Will auto-advance to next field after a short delay for visual feedback.
   */
  const handleFieldSelection = useCallback(
    (fieldType: string, _value: unknown) => {
      if (!enabled) return;

      // Only auto-jump for single-select field types
      const singleSelectTypes = ["RadioGroup", "Select", "ToggleGroup"];
      if (singleSelectTypes.includes(fieldType)) {
        // Respect prefers-reduced-motion: skip delay if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const delay = prefersReducedMotion ? 0 : 300;
        if (delay === 0) {
          onAdvance();
        } else {
          setTimeout(onAdvance, delay);
        }
      }
    },
    [enabled, onAdvance],
  );

  return { handleFieldSelection };
};
