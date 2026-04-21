import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { extractErrorMessage, getAriaLabelFallback } from "./shared";
import type { FieldRendererProps } from "./shared";

const InputField = ({ element, form }: FieldRendererProps<"Input">) => (
  <form.AppField name={element.name}>
    {(f) => {
      const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
      const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
      return (
        <>
          <Input
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
              "w-full rounded-lg border-none h-7 bg-card pl-[10px] pr-[8px] shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] placeholder:text-muted-foreground/50",
              hasErrors && "ring-1 ring-destructive",
            )}
          />
          {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
        </>
      );
    }}
  </form.AppField>
);

export default InputField;
