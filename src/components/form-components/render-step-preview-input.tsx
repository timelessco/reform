import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDownIcon, Trash2Icon, UploadIcon } from "@/components/ui/icons";
import { LETTER_LABELS } from "@/components/ui/form-option-item-node";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/reui/phone-input";
import { useFileUpload } from "@/hooks/use-file-upload";
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
                  "w-full min-h-24 rounded-[var(--radius-lg)] border-0 bg-card dark:bg-muted/30 pl-[10px] pr-[8px] shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] placeholder:text-muted-foreground/50",
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
                  "w-full rounded-(--radius-lg) border-none h-7 bg-card dark:bg-muted/30 pl-[10px] pr-[8px] shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] placeholder:text-muted-foreground/50",
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
              <PhoneInput
                id={element.name}
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(value) => f.handleChange(value)}
                onBlur={f.handleBlur}
                aria-invalid={hasErrors}
                variant="sm"
                className={cn(hasErrors && "[&_*]:ring-destructive/20 [&_*]:ring-[3px]")}
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
    return <FileUploadPreview element={element} form={form} />;
  }

  // Form field: Checkbox
  if (element.fieldType === "Checkbox" && "options" in element) {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          const selectedValues = (f.state.value as string[] | undefined) ?? [];

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
              <div className="flex flex-col gap-2">
                {element.options.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          f.handleChange([...selectedValues, option.value]);
                        } else {
                          f.handleChange(selectedValues.filter((v: string) => v !== option.value));
                        }
                      }}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: MultiChoice (single select with letter badges)
  if (element.fieldType === "MultiChoice" && "options" in element) {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          const selectedValue = (f.state.value as string | undefined) ?? "";
          const LETTERS = LETTER_LABELS;

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
              <div className="flex flex-col gap-2">
                {element.options.map((option, idx) => {
                  const isSelected = selectedValue === option.value;
                  const letter = LETTERS[idx % LETTERS.length];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => f.handleChange(isSelected ? "" : option.value)}
                      className={cn(
                        "flex items-center gap-2 py-1 text-sm transition-colors text-left cursor-pointer",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-semibold leading-none",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
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
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: MultiSelect (dropdown with tag pills)
  if (element.fieldType === "MultiSelect" && "options" in element) {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          const selectedValues = (f.state.value as string[] | undefined) ?? [];

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
              <MultiSelect
                options={element.options}
                value={selectedValues}
                onChange={(val) => f.handleChange(val)}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Ranking (click-to-rank)
  if (element.fieldType === "Ranking" && "options" in element) {
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
          const rankedValues = (f.state.value as string[] | undefined) ?? [];

          const handleRankClick = (optionValue: string) => {
            if (rankedValues.includes(optionValue)) {
              // Un-rank: remove this and all after it
              const idx = rankedValues.indexOf(optionValue);
              f.handleChange(rankedValues.slice(0, idx));
            } else {
              const newRanked = [...rankedValues, optionValue];
              // Auto-rank last remaining if only one left
              if (newRanked.length === element.options.length - 1) {
                const remaining = element.options.find((o) => !newRanked.includes(o.value));
                if (remaining) {
                  f.handleChange([...newRanked, remaining.value]);
                  return;
                }
              }
              f.handleChange(newRanked);
            }
          };

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
              <div className="flex flex-col gap-2">
                {/* Show ranked items first (in rank order), then unranked items */}
                {[
                  ...rankedValues
                    .map((v) => element.options.find((o) => o.value === v))
                    .filter((o): o is { value: string; label: string } => Boolean(o)),
                  ...element.options.filter((o) => !rankedValues.includes(o.value)),
                ].map((option) => {
                  const rankIndex = rankedValues.indexOf(option.value);
                  const isRanked = rankIndex !== -1;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRankClick(option.value)}
                      className={cn(
                        "flex items-center gap-2 py-1 text-sm transition-colors text-left cursor-pointer",
                      )}
                    >
                      {isRanked ? (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-primary text-[9px] font-semibold leading-none text-primary-foreground">
                          {rankIndex + 1}
                        </span>
                      ) : (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border text-muted-foreground">
                          <ChevronsUpDownIcon className="size-2.5" />
                        </span>
                      )}
                      <span>{option.label}</span>
                    </button>
                  );
                })}
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

const FileUploadPreview = ({ element, form }: RenderStepPreviewInputProps) => {
  const label = "label" in element ? (element.label as string) : "";
  const required = "required" in element ? Boolean(element.required) : false;
  const [
    { files },
    {
      removeFile,
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
  ] = useFileUpload({
    accept: "image/*,.pdf,.doc,.docx",
    maxSize: 10 * 1024 * 1024, // 10MB
    onFilesChange: (updatedFiles) => {
      const fileName = updatedFiles[0]?.file.name ?? "";
      form.setFieldValue(element.name, fileName);
    },
  });

  const file = files[0];
  const previewUrl = file?.preview;
  const fileName = file?.file.name;
  const isImage = file?.file instanceof File ? file.file.type.startsWith("image/") : false;

  return (
    <form.AppField name={element.name}>
      {(f) => {
        const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
        const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
        return (
          <div className="space-y-2">
            <Label htmlFor={element.name}>
              {label}
              {required && (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 ml-2">
                  *
                </span>
              )}
            </Label>
            <button
              type="button"
              className={cn(
                "relative flex min-h-20 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/50 p-4 cursor-pointer hover:bg-accent/50 transition-colors shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)]",
              )}
              onClick={!file ? openFileDialog : undefined}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input {...getInputProps()} className="sr-only" />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  {isImage && previewUrl ? (
                    <div className="overflow-hidden rounded-md border border-border/40">
                      <img
                        src={previewUrl}
                        alt={fileName}
                        className="max-h-48 max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground truncate max-w-[200px]">{fileName}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                        f.handleChange("");
                      }}
                      aria-label={`Remove ${fileName}`}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50 select-none">
                  <UploadIcon className="size-5" />
                  <span className="text-sm">Click or drag to upload</span>
                  <span className="text-xs">PNG, JPG, PDF up to 10MB</span>
                </div>
              )}
            </button>
            {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        );
      }}
    </form.AppField>
  );
};
