import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { extractErrorMessage, getAriaLabelFallback } from "./shared";
import type { FieldRendererProps } from "./shared";

const LinkField = ({ element, form }: FieldRendererProps<"Link">) => (
  <form.AppField name={element.name}>
    {(f) => {
      const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
      const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
      return (
        <>
          <Input
            id={element.name}
            name={element.name}
            type="url"
            placeholder={element.placeholder}
            value={(f.state.value as string | undefined) ?? ""}
            onChange={(e) => f.handleChange(e.target.value)}
            onBlur={f.handleBlur}
            autoComplete="off"
            aria-invalid={hasErrors}
            aria-label={getAriaLabelFallback(element)}
            className={cn("form-input h-7 pl-[10px] pr-[8px]", hasErrors && "form-input-error")}
          />
          {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
        </>
      );
    }}
  </form.AppField>
);

export default LinkField;
