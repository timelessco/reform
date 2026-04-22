import { LETTER_LABELS } from "@/components/ui/form-option-item-constants";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "./shared";
import type { FieldRendererProps } from "./shared";

const MultiChoiceField = ({ element, form }: FieldRendererProps<"MultiChoice">) => (
  <form.AppField name={element.name}>
    {(f) => {
      const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
      const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
      const selectedValue = (f.state.value as string | undefined) ?? "";

      return (
        <>
          <div className="flex flex-col gap-2">
            {element.options.map((option, idx) => {
              const isSelected = selectedValue === option.value;
              const letter = LETTER_LABELS[idx % LETTER_LABELS.length];
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => f.handleChange(isSelected ? "" : option.value)}
                  className={cn(
                    "flex items-center gap-2 py-1 text-sm transition-colors text-left cursor-pointer",
                    hasErrors && "text-destructive",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-semibold leading-none",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                      hasErrors && !isSelected && "ring-1 ring-destructive",
                    )}
                  >
                    {letter}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
        </>
      );
    }}
  </form.AppField>
);

export default MultiChoiceField;
