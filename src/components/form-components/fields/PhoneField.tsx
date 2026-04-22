import { PhoneInput } from "@/components/ui/phone-input";
import { extractErrorMessage, getAriaLabelFallback } from "./shared";
import type { FieldRendererProps } from "./shared";

const PhoneField = ({ element, form }: FieldRendererProps<"Phone">) => (
  <form.AppField name={element.name}>
    {(f) => {
      const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
      const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
      return (
        <>
          <PhoneInput
            id={element.name}
            placeholder={element.placeholder}
            value={(f.state.value as string | undefined) ?? ""}
            onChange={(value) => f.handleChange(value)}
            onBlur={f.handleBlur}
            aria-invalid={hasErrors}
            aria-label={getAriaLabelFallback(element)}
            variant="sm"
          />
          {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
        </>
      );
    }}
  </form.AppField>
);

export default PhoneField;
