import { CircleUserRoundIcon } from "@/components/ui/icons";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/use-file-upload";

// eslint-disable-next-line eslint/no-unused-vars -- component preserved for future use
const Component = () => {
  const [{ files }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
    accept: "image/*",
  });

  const previewUrl = files[0]?.preview || null;
  const fileName = files[0]?.file.name || null;

  const handleRemove = useCallback(() => removeFile(files[0]?.id), [removeFile, files]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="inline-flex items-center gap-2 align-top">
        <div
          role="img"
          aria-label={previewUrl ? "Preview of uploaded image" : "Default user avatar"}
          className="border-input relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border"
        >
          {previewUrl ? (
            <img
              className="size-full object-cover"
              src={previewUrl}
              alt={previewUrl ? "Uploaded preview" : ""}
              width={32}
              height={32}
            />
          ) : (
            <div aria-hidden="true">
              <CircleUserRoundIcon className="opacity-60" size={16} />
            </div>
          )}
        </div>
        <div className="relative inline-block">
          <Button onClick={openFileDialog} aria-haspopup="dialog">
            {fileName ? "Change image" : "Upload image"}
          </Button>
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload image file"
            tabIndex={-1}
          />
        </div>
      </div>
      {fileName ? (
        <div className="inline-flex gap-2 text-xs">
          <p className="text-muted-foreground truncate" aria-live="polite">
            {fileName}
          </p>
          <Button
            variant="link"
            onClick={handleRemove}
            className="cursor-pointer text-destructive p-0 h-auto text-xs"
            aria-label={`Remove ${fileName}`}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div className="inline-flex gap-2 text-xs">
          <p className="text-muted-foreground truncate" aria-live="polite">
            No image attached
          </p>
        </div>
      )}
    </div>
  );
};
