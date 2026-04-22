import { useRef, useState } from "react";

import { Trash2Icon, UploadIcon } from "@/components/ui/icons";
import { useStepForm } from "@/contexts/step-form-context";
import { useFileUpload } from "@/hooks/use-file-upload";
import type { UploadedFormFile } from "@/lib/server-fn/public-file-uploads";
import { uploadFormFile } from "@/lib/server-fn/public-file-uploads";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "./shared";
import type { FieldRendererProps } from "./shared";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Failed to read file"));
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

const FileUploadField = ({ element, form }: FieldRendererProps<"FileUpload">) => {
  const accept =
    element.accept && element.accept.length > 0 ? element.accept : "image/*,.pdf,.doc,.docx";

  const { formId } = useStepForm();
  const draftIdRef = useRef<string>(crypto.randomUUID());
  const [uploadState, setUploadState] = useState<FileUploadState>({ status: "idle" });

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
    setUploadState({ status: "uploading", localPreview, fileName: picked.name, isImage });

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
      if (picked instanceof File) handleUpload(picked);
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
          <>
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
          </>
        );
      }}
    </form.AppField>
  );
};

export default FileUploadField;
