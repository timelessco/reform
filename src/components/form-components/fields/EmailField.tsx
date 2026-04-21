import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { extractErrorMessage, getAriaLabelFallback } from "./shared";
import type { FieldRendererProps } from "./shared";

const EmailField = ({ element, form }: FieldRendererProps<"Email">) => (
  <form.AppField name={element.name}>
    {(f) => {
      const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
      const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
      return (
        <>
          <Input
            id={element.name}
            name={element.name}
            type="email"
            placeholder={element.placeholder}
            value={(f.state.value as string | undefined) ?? ""}
            onChange={(e) => f.handleChange(e.target.value)}
            onBlur={f.handleBlur}
            autoComplete="off"
            aria-invalid={hasErrors}
            aria-label={getAriaLabelFallback(element)}
            className={cn(
              "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
              hasErrors && "ring-1 ring-destructive",
            )}
          />
          {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
        </>
      );
    }}
  </form.AppField>
);

export default EmailField;
