import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDownIcon, Trash2Icon, UploadIcon } from "@/components/ui/icons";
import { LETTER_LABELS } from "@/components/ui/form-option-item-node";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import {
  TimePicker,
  TimePickerContent,
  TimePickerHour,
  TimePickerInput,
  TimePickerInputGroup,
  TimePickerMinute,
  TimePickerSecond,
  TimePickerSeparator,
  TimePickerTrigger,
} from "@/components/ui/time-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useStepForm } from "@/contexts/step-form-context";
import type { AppForm } from "@/hooks/use-form-builder";
import { uploadFormFile } from "@/lib/server-fn/public-file-uploads";
import type { UploadedFormFile } from "@/lib/server-fn/public-file-uploads";
import type { PlateFormField } from "@/lib/editor/transform-plate-to-form";
import { useRef, useState } from "react";

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

/** Renders the label text with the correct HTML element based on labelType */
const FieldLabelText = ({
  text,
  labelType,
  htmlFor,
  required,
}: {
  text: string;
  labelType?: string;
  htmlFor: string;
  required?: boolean;
}) => {
  const requiredBadge = required ? (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label="Required field"
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-[8px] bg-destructive/15 text-destructive",
              "ml-auto mr-1",
            )}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.3892 5.68944L12.793 6.92754L9.02484 8.21946L11.4741 11.53L10.4244 12.3375L7.94824 8.91925L5.57971 12.3106L4.53002 11.5031L6.89855 8.21946L3.15735 6.95445L3.58799 5.68944L7.27536 7.00828V3.02484H8.64803V6.98137L12.3892 5.68944Z"
                fill="currentColor"
              />
            </svg>
          </span>
        }
      />
      <TooltipContent side="right">Required</TooltipContent>
    </Tooltip>
  ) : null;

  if (labelType === "h1") {
    return (
      <div className="flex w-full items-center">
        <h1 className="flex-1 mt-[0.40em] pb-1 font-bold font-heading text-4xl">{text}</h1>
        {requiredBadge}
      </div>
    );
  }
  if (labelType === "h2") {
    return (
      <div className="flex w-full items-center">
        <h2 className="flex-1 mt-[0.40em] pb-px font-heading font-semibold text-2xl">{text}</h2>
        {requiredBadge}
      </div>
    );
  }
  if (labelType === "h3") {
    return (
      <div className="flex w-full items-center">
        <h3 className="flex-1 mt-[0.30em] pb-px font-heading font-semibold text-xl">{text}</h3>
        {requiredBadge}
      </div>
    );
  }
  if (labelType === "blockquote") {
    return (
      <div className="flex w-full items-center">
        <blockquote className="flex-1 my-1 border-l-2 pl-6 italic">{text}</blockquote>
        {requiredBadge}
      </div>
    );
  }

  // Default: formLabel, p, or undefined — use standard Label
  return (
    <Label htmlFor={htmlFor} className="w-full">
      <span className="flex-1">{text}</span>
      {requiredBadge}
    </Label>
  );
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
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
                  "w-full min-h-24 rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] placeholder:text-muted-foreground/50",
                  hasErrors && "ring-1 ring-destructive",
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
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
                  "w-full rounded-lg border-none h-7 bg-card pl-[10px] pr-[8px] shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] placeholder:text-muted-foreground/50",
                  hasErrors && "ring-1 ring-destructive",
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
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
                  hasErrors && "ring-1 ring-destructive",
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
              <PhoneInput
                id={element.name}
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(value) => f.handleChange(value)}
                onBlur={f.handleBlur}
                aria-invalid={hasErrors}
                variant="sm"
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
              <Input
                id={element.name}
                name={element.name}
                type="number"
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
                    e.preventDefault();
                  }
                }}
                onBlur={f.handleBlur}
                autoComplete="off"
                aria-invalid={hasErrors}
                className={cn(
                  "w-full rounded-(--radius-lg) border-0 h-7 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-1 ring-destructive",
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
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
                  hasErrors && "ring-1 ring-destructive",
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
              <DatePicker
                value={(f.state.value as string) ?? null}
                onChange={(val) => f.handleChange(val ?? "")}
                className={cn(hasErrors && "ring-1 ring-destructive")}
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
              <TimePicker
                name={element.name}
                value={(f.state.value as string | undefined) ?? "00:00:00"}
                onValueChange={(v) => f.handleChange(v)}
                showSeconds
                invalid={hasErrors}
              >
                <TimePickerInputGroup
                  className={cn(
                    "rounded-(--radius-lg) border-0 h-7 bg-card px-[10px] shadow-form-input",
                    hasErrors && "ring-1 ring-destructive",
                  )}
                  onBlur={f.handleBlur}
                >
                  <TimePickerInput segment="hour" className="text-sm" />
                  <TimePickerSeparator />
                  <TimePickerInput segment="minute" className="text-sm" />
                  <TimePickerSeparator />
                  <TimePickerInput segment="second" className="text-sm" />
                  <TimePickerTrigger />
                </TimePickerInputGroup>
                <TimePickerContent>
                  <TimePickerHour />
                  <TimePickerMinute />
                  <TimePickerSecond />
                </TimePickerContent>
              </TimePicker>
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
              <div className="flex flex-col gap-2">
                {element.options.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      hasErrors && "text-destructive",
                    )}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          f.handleChange([...selectedValues, option.value]);
                        } else {
                          f.handleChange(selectedValues.filter((v: string) => v !== option.value));
                        }
                      }}
                      aria-invalid={hasErrors}
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
              <MultiSelect
                options={element.options}
                value={selectedValues}
                onChange={(val) => f.handleChange(val)}
                className={cn(hasErrors && "[&>button]:ring-1 [&>button]:ring-destructive")}
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
            <div className="space-y-2" data-bf-input="true">
              <FieldLabelText
                text={element.label ?? ""}
                labelType={"labelType" in element ? (element.labelType as string) : undefined}
                htmlFor={element.name}
                required={element.required}
              />
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
                        hasErrors && "text-destructive",
                      )}
                    >
                      {isRanked ? (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-primary text-[9px] font-semibold leading-none text-primary-foreground">
                          {rankIndex + 1}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border text-muted-foreground",
                            hasErrors && "border-destructive ring-1 ring-destructive",
                          )}
                        >
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

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file"));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Failed to read file")),
    );
    reader.readAsDataURL(file);
  });

type FileUploadState =
  | { status: "idle" }
  | {
      status: "uploading";
      localPreview: string | null;
      fileName: string;
      isImage: boolean;
    }
  | { status: "done"; value: UploadedFormFile; localPreview: string | null }
  | { status: "error"; message: string };

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Too many uploads. Please wait a moment and try again.",
  form_not_found: "This form is no longer accepting uploads.",
  file_field_not_found: "Upload field is not configured.",
  mime_not_allowed: "This file type isn't allowed.",
  file_too_large: "File is larger than 10 MB.",
  empty_file: "File is empty.",
};

const FileUploadPreview = ({ element, form }: RenderStepPreviewInputProps) => {
  const label = "label" in element ? (element.label as string) : "";
  const required = "required" in element ? Boolean(element.required) : false;
  const accept =
    "accept" in element && typeof element.accept === "string" && element.accept.length > 0
      ? element.accept
      : "image/*,.pdf,.doc,.docx";

  const { formId } = useStepForm();
  const draftIdRef = useRef<string>(crypto.randomUUID());
  const [uploadState, setUploadState] = useState<FileUploadState>({
    status: "idle",
  });

  const handleUpload = async (picked: File) => {
    if (!formId) {
      setUploadState({
        status: "error",
        message: "Uploads are only available on published forms.",
      });
      return;
    }

    const isImage = picked.type.startsWith("image/");
    const localPreview = isImage ? URL.createObjectURL(picked) : null;
    setUploadState({
      status: "uploading",
      localPreview,
      fileName: picked.name,
      isImage,
    });

    try {
      const base64 = await fileToBase64(picked);
      const value = await uploadFormFile({
        data: {
          formId,
          draftId: draftIdRef.current,
          fieldName: element.name,
          filename: picked.name,
          contentType: picked.type || "application/octet-stream",
          base64,
        },
      });
      setUploadState({ status: "done", value, localPreview });
      form.setFieldValue(element.name, value);
    } catch (err) {
      const code = err instanceof Error ? err.message : "upload_failed";
      setUploadState({
        status: "error",
        message: UPLOAD_ERROR_MESSAGES[code] ?? "Upload failed. Please try again.",
      });
      if (localPreview) URL.revokeObjectURL(localPreview);
    }
  };

  const [
    ,
    { openFileDialog, getInputProps, handleDragEnter, handleDragLeave, handleDragOver, handleDrop },
  ] = useFileUpload({
    accept,
    maxSize: 10 * 1024 * 1024,
    onFilesChange: (updatedFiles) => {
      const picked = updatedFiles[0]?.file;
      if (picked instanceof File) {
        handleUpload(picked);
      }
    },
  });

  const reset = () => {
    if (uploadState.status === "done" && uploadState.localPreview) {
      URL.revokeObjectURL(uploadState.localPreview);
    }
    if (uploadState.status === "uploading" && uploadState.localPreview) {
      URL.revokeObjectURL(uploadState.localPreview);
    }
    setUploadState({ status: "idle" });
  };

  const hasFile = uploadState.status === "uploading" || uploadState.status === "done";
  const previewUrl =
    uploadState.status === "done"
      ? uploadState.value.type.startsWith("image/")
        ? uploadState.value.url
        : null
      : uploadState.status === "uploading"
        ? uploadState.localPreview
        : null;
  const fileName =
    uploadState.status === "done"
      ? uploadState.value.name
      : uploadState.status === "uploading"
        ? uploadState.fileName
        : "";

  return (
    <form.AppField name={element.name}>
      {(f) => {
        const hasFieldErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
        const fieldErrorMessage = hasFieldErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";
        const showError = uploadState.status === "error" || hasFieldErrors;
        const errorMessage =
          uploadState.status === "error" ? uploadState.message : fieldErrorMessage;

        return (
          <div className="space-y-2" data-bf-input="true">
            <FieldLabelText
              text={label}
              labelType={"labelType" in element ? (element.labelType as string) : undefined}
              htmlFor={element.name}
              required={required}
            />
            <button
              type="button"
              className={cn(
                "relative flex min-h-20 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)]",
                showError && "border-destructive ring-1 ring-destructive",
              )}
              onClick={!hasFile ? openFileDialog : undefined}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input {...getInputProps()} className="sr-only" />
              {hasFile ? (
                <div className="flex flex-col items-center gap-2">
                  {previewUrl ? (
                    <div className="overflow-hidden rounded-md border border-border/40">
                      <img
                        src={previewUrl}
                        alt={fileName}
                        className="max-h-48 max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {uploadState.status === "uploading" ? `Uploading ${fileName}…` : fileName}
                    </span>
                    {uploadState.status === "done" ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          reset();
                          f.handleChange("");
                        }}
                        aria-label={`Remove ${fileName}`}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    ) : null}
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
            {showError ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>
        );
      }}
    </form.AppField>
  );
};
