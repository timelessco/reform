import { FileQuestionIcon, LockIcon } from "@/components/ui/icons";
import type { Value } from "platejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { BrandingFooter } from "@/components/public/branding-footer";
import { AlreadySubmitted, FormClosed } from "@/components/public/form-closed";
import { PasswordGate } from "@/components/public/password-gate";
import { TranslationProvider, useTranslation } from "@/contexts/translation-context";
import { createPublicSubmission } from "@/lib/fn/public";
import { getTranslations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { type PublicFormSettings, defaultPublicFormSettings } from "@/types/form-settings";

interface PublicForm {
  id: string;
  title: string;
  content: any;
  customization?: Record<string, string>;
  icon: string | null;
  cover: string | null;
  status: string;
  settings?: PublicFormSettings;
}

interface GatedState {
  type: "closed" | "date_expired" | "limit_reached" | "password_required";
  message?: string | null;
}

/** Embed display configuration for the public form page */
export interface PublicFormEmbedConfig {
  title: "visible" | "hidden";
  background: "transparent" | "solid";
  alignment: "center" | "left";
  dynamicHeight: boolean;
}

export const defaultPublicFormEmbedConfig: PublicFormEmbedConfig = {
  title: "visible",
  background: "solid",
  alignment: "center",
  dynamicHeight: false,
};

interface PublicFormPageProps {
  form: PublicForm | null;
  error: "not_found" | null;
  formId: string;
  gated?: GatedState | null;
  /** Whether this form is loaded in a popup iframe */
  isPopup?: boolean;
  /** Embed display configuration */
  embedConfig?: PublicFormEmbedConfig;
}

/**
 * Send a message to the parent window (for popup embeds)
 */
function sendToParent(event: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined" || window.parent === window) return;

  try {
    window.parent.postMessage(JSON.stringify({ event, ...payload }), "*");
  } catch (e) {
    console.error("[Reform] Failed to send message to parent:", e);
  }
}

function FormNotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon />
          </EmptyMedia>
          <EmptyTitle>{t("formNotFound")}</EmptyTitle>
          <EmptyDescription>{t("formNotFoundDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

function FormNotPublished() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon />
          </EmptyMedia>
          <EmptyTitle>{t("formNotAvailable")}</EmptyTitle>
          <EmptyDescription>{t("formNotAvailableDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function PublicFormPage({
  form,
  error,
  formId,
  gated,
  isPopup = false,
  embedConfig = defaultPublicFormEmbedConfig,
}: PublicFormPageProps) {
  const transparentBackground = embedConfig.background === "transparent";
  const hideTitle = embedConfig.title === "hidden";
  const alignLeft = embedConfig.alignment === "left";
  const dynamicHeight = embedConfig.dynamicHeight;
  const containerRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const resolvedLanguage = form?.settings?.language ?? "English";

  // Check duplicate prevention on mount
  useEffect(() => {
    if (form?.settings?.preventDuplicateSubmissions) {
      try {
        if (localStorage.getItem(`bf-submitted-${formId}`) === "1") {
          setSubmitted(true);
        }
      } catch {
        // localStorage unavailable
      }
    }
  }, [form?.settings?.preventDuplicateSubmissions, formId]);

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
    sendToParent("Reform.FormLoaded", { formId });

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
        sendToParent("Reform.Resize", { height });
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

        // Mark as submitted for duplicate prevention
        if (form?.settings?.preventDuplicateSubmissions) {
          try {
            localStorage.setItem(`bf-submitted-${formId}`, "1");
          } catch {
            // localStorage unavailable
          }
        }

        // Notify parent of submission (for popup embeds)
        if (isPopup) {
          sendToParent("Reform.FormSubmitted", {
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
        toast.error(getTranslations(resolvedLanguage).submitFailed);
        throw err; // Re-throw so the form knows it failed
      }
    },
    [formId, isPopup, form?.title, form?.settings?.preventDuplicateSubmissions, resolvedLanguage],
  );

  // Handle error states
  if (error === "not_found" || !form) {
    return (
      <TranslationProvider language={resolvedLanguage}>
        <FormNotFound />
      </TranslationProvider>
    );
  }

  // Handle non-published status (shouldn't happen with SSR, but defensive)
  if (form.status !== "published") {
    return (
      <TranslationProvider language={resolvedLanguage}>
        <FormNotPublished />
      </TranslationProvider>
    );
  }

  // Handle gated states (closed, date expired, limit reached)
  if (gated && gated.type !== "password_required") {
    return (
      <TranslationProvider language={resolvedLanguage}>
        <FormClosed message={gated.message} />
      </TranslationProvider>
    );
  }

  // Handle duplicate prevention (client-side check)
  if (submitted) {
    return (
      <TranslationProvider language={resolvedLanguage}>
        <AlreadySubmitted />
      </TranslationProvider>
    );
  }

  // Get settings with defaults
  const settings = form.settings ?? defaultPublicFormSettings;

  // Render the form content
  const formContent = (
    <div
      ref={containerRef}
      className={cn(
        "pb-8 overflow-x-hidden",
        form.customization && Object.keys(form.customization).length > 0 && "bf-themed",
        // Don't use min-h-screen for popup mode - it causes resize loop
        !isPopup && "min-h-screen",
        transparentBackground || isPopup ? "bg-transparent" : "bg-white",
        alignLeft && "text-left",
      )}
      aria-live="polite"
    >
      <FormPreviewFromPlate
        content={form.content as Value}
        title={hideTitle ? undefined : form.title}
        icon={hideTitle ? undefined : (form.icon ?? undefined)}
        cover={hideTitle ? undefined : (form.cover ?? undefined)}
        onSubmit={handleSubmit}
        hideTitle={hideTitle}
        settings={settings}
        formId={formId}
      />
      {settings.branding && <BrandingFooter />}
    </div>
  );

  // Wrap with password gate if needed
  if (gated?.type === "password_required") {
    return (
      <TranslationProvider language={resolvedLanguage}>
        <PasswordGate formId={formId}>{formContent}</PasswordGate>
      </TranslationProvider>
    );
  }

  return <TranslationProvider language={resolvedLanguage}>{formContent}</TranslationProvider>;
}
