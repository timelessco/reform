import { useCallback } from "react";

/**
 * Hook for auto-jumping to the next field after selection.
 * Currently a placeholder - will be fully implemented when
 * radio/select field types are added to the form builder.
 */
export function useAutoJump(enabled: boolean, onAdvance: () => void) {
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
        // Small delay for visual feedback before advancing
        setTimeout(onAdvance, 300);
      }
    },
    [enabled, onAdvance],
  );

  return { handleFieldSelection };
}
