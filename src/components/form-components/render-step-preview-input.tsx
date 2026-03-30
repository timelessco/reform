import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import type { AppForm } from "@/hooks/use-form-builder";
import type { PlateFormField } from "@/lib/transform-plate-to-form";

interface RenderStepPreviewInputProps {
  element: PlateFormField;
  form: AppForm;
}

/**
 * Extracts error message from Zod/TanStack Form error object
 */
const extractErrorMessage = (error: unknown): string => {
  if (!error) return "Invalid value";

  if (Array.isArray(error)) {
    return extractErrorMessage(error[0]);
  }

  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "Invalid value";
};

/**
 * Renders a form field (Input or Textarea) in the step form.
 * Buttons are handled separately in StepForm.
 */
export const RenderStepPreviewInput = ({ element, form }: RenderStepPreviewInputProps) => {
  // Form field: Textarea
  if (element.fieldType === "Textarea") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";

          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
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
                className={cn(
                  "w-full min-h-24 rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Input
  if (element.fieldType === "Input") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";

          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
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
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Email
  if (element.fieldType === "Email") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
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
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Phone
  if (element.fieldType === "Phone") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
              <Input
                id={element.name}
                name={element.name}
                type="tel"
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
                autoComplete="off"
                aria-invalid={hasErrors}
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Number
  if (element.fieldType === "Number") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
              <Input
                id={element.name}
                name={element.name}
                type="number"
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
                autoComplete="off"
                aria-invalid={hasErrors}
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Link
  if (element.fieldType === "Link") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
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
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Date
  if (element.fieldType === "Date") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
              <DatePicker
                value={(f.state.value as string) ?? null}
                onChange={(val) => f.handleChange(val ?? "")}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Time
  if (element.fieldType === "Time") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
              <Input
                id={element.name}
                name={element.name}
                type="time"
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
                autoComplete="off"
                aria-invalid={hasErrors}
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: FileUpload
  if (element.fieldType === "FileUpload") {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                    *
                  </span>
                )}
              </Label>
              <div className="relative flex min-h-20 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/50 p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                <input
                  id={element.name}
                  name={element.name}
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) f.handleChange(file.name);
                  }}
                />
                <span className="text-sm text-muted-foreground">Click or drag to upload</span>
              </div>
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  return null;
};
