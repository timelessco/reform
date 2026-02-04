import { FileQuestion, Lock } from "lucide-react";
import type { Value } from "platejs";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { createPublicSubmission } from "@/lib/fn/public";
import { cn } from "@/lib/utils";

interface PublicForm {
  id: string;
  title: string;
  content: any;
  icon: string | null;
  cover: string | null;
  status: string;
}

interface PublicFormPageProps {
  form: PublicForm | null;
  error: "not_found" | null;
  formId: string;
  transparentBackground?: boolean;
  /** Whether this form is loaded in a popup iframe */
  isPopup?: boolean;
  /** Hide the form title */
  hideTitle?: boolean;
  /** Align form content to the left */
  alignLeft?: boolean;
  /** Enable dynamic height communication for standard iframe embeds */
  dynamicHeight?: boolean;
}

/**
 * Send a message to the parent window (for popup embeds)
 */
function sendToParent(event: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined" || window.parent === window) return;

  try {
    window.parent.postMessage(JSON.stringify({ event, ...payload }), "*");
  } catch (e) {
    console.error("[BetterForms] Failed to send message to parent:", e);
  }
}

function FormNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-3">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Form not found</h1>
          <p className="text-muted-foreground">
            This form doesn't exist or is no longer available.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormNotPublished() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-3">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Form not available</h1>
          <p className="text-muted-foreground">This form is not currently accepting responses.</p>
        </div>
      </div>
    </div>
  );
}

export function PublicFormPage({
  form,
  error,
  formId,
  transparentBackground,
  isPopup = false,
  hideTitle = false,
  alignLeft = false,
  dynamicHeight = false,
}: PublicFormPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle body/html transparency for iframes
  useEffect(() => {
    if (transparentBackground || isPopup) {
      const originalBodyBg = document.body.style.background;
      const originalHtmlBg = document.documentElement.style.background;

      document.body.style.background = "transparent";
      document.documentElement.style.background = "transparent";

      return () => {
        document.body.style.background = originalBodyBg;
        document.documentElement.style.background = originalHtmlBg;
      };
    }
  }, [transparentBackground, isPopup]);

  // Setup height communication for popup embeds and standard embeds with dynamicHeight
  useEffect(() => {
    if ((!isPopup && !dynamicHeight) || typeof window === "undefined" || window.parent === window)
      return;

    // Notify parent that form has loaded
    sendToParent("BetterForms.FormLoaded", { formId });

    // Track last sent height to avoid redundant messages
    let lastHeight = 0;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const sendHeight = () => {
      const container = containerRef.current;
      if (!container) return;

      // Use the container's scroll height, not document.body
      const height = container.scrollHeight;

      // Only send if height actually changed (with small tolerance)
      if (Math.abs(height - lastHeight) > 2) {
        lastHeight = height;
        sendToParent("BetterForms.Resize", { height });
      }
    };

    // Debounced resize handler
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(sendHeight, 50);
    };

    // Setup resize observer on the container element
    const resizeObserver = new ResizeObserver(handleResize);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Send initial height after a short delay to let content render
    setTimeout(sendHeight, 150);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isPopup, dynamicHeight, formId]);

  const handleSubmit = useCallback(
    async (values: Record<string, any>) => {
      try {
        await createPublicSubmission({
          data: {
            formId,
            data: values,
            isCompleted: true,
          },
        });

        // Notify parent of submission (for popup embeds)
        if (isPopup) {
          sendToParent("BetterForms.FormSubmitted", {
            formId,
            payload: {
              formId,
              formName: form?.title,
              data: values,
            },
          });
        }
      } catch (err) {
        console.error("Submission error:", err);
        toast.error("Failed to submit form. Please try again.");
        throw err; // Re-throw so the form knows it failed
      }
    },
    [formId, isPopup, form?.title],
  );

  // Handle error states
  if (error === "not_found" || !form) {
    return <FormNotFound />;
  }

  // Handle non-published status (shouldn't happen with SSR, but defensive)
  if (form.status !== "published") {
    return <FormNotPublished />;
  }

  // Render the form - FormPreviewFromPlate handles thank you page via StepFormContext
  return (
    <div
      ref={containerRef}
      className={cn(
        "py-8 px-4",
        // Don't use min-h-screen for popup mode - it causes resize loop
        !isPopup && "min-h-screen",
        transparentBackground || isPopup ? "bg-transparent" : "bg-white",
        alignLeft && "text-left",
      )}
    >
      <FormPreviewFromPlate
        content={form.content as Value}
        title={hideTitle ? undefined : form.title}
        icon={hideTitle ? undefined : (form.icon ?? undefined)}
        cover={hideTitle ? undefined : (form.cover ?? undefined)}
        onSubmit={handleSubmit}
        hideTitle={hideTitle}
      />
    </div>
  );
}
