import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { extractErrorMessage, getAriaLabelFallback } from "./shared";
import type { FieldRendererProps } from "./shared";

const TextareaField = ({ element, form }: FieldRendererProps<"Textarea">) => (
  <form.AppField name={element.name}>
    {(f) => {
      const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
      const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
      return (
        <>
          <Textarea
            id={element.name}
            name={element.name}
            placeholder={element.placeholder}
            value={(f.state.value as string | undefined) ?? ""}
            onChange={(e) => f.handleChange(e.target.value)}
            onBlur={f.handleBlur}
            minLength={element.minLength}
            maxLength={element.maxLength}
            autoComplete="off"
            aria-invalid={hasErrors}
            aria-label={getAriaLabelFallback(element)}
            className={cn(
              "form-input min-h-24 pl-[10px] pr-[8px]",
              hasErrors && "form-input-error",
            )}
          />
          {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
        </>
      );
    }}
  </form.AppField>
);

export default TextareaField;
