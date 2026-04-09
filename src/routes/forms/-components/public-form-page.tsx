import { FileQuestionIcon, LockIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { Value } from "platejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { BrandingFooter } from "./branding-footer";
import { AlreadySubmitted, FormClosed } from "@/routes/forms/-components/form-closed";
import { PasswordGate } from "@/routes/forms/-components/password-gate";
import { TranslationProvider, useTranslation } from "@/contexts/translation-context";
import { createPublicSubmission } from "@/lib/server-fn/public-submissions";
import { getTranslations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { defaultPublicFormSettings } from "@/types/form-settings";
import type { PublicFormSettings } from "@/types/form-settings";

interface PublicForm {
  id: string;
  title: string;
  content: unknown;
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
  dynamicWidth: boolean;
}

export const defaultPublicFormEmbedConfig: PublicFormEmbedConfig = {
  title: "visible",
  background: "solid",
  alignment: "center",
  dynamicHeight: false,
  dynamicWidth: false,
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
  /** Optional viewer-side theme toggle (shown only when creator selected "system") */
  themeToggle?: {
    current: "light" | "dark";
    onChange: (next: "light" | "dark" | "system") => void;
  };
}

/**
 * Send a message to the parent window (for popup embeds)
 */
const sendToParent = (event: string, payload?: Record<string, unknown>): void => {
  if (typeof window === "undefined" || window.parent === window) return;

  try {
    window.parent.postMessage(JSON.stringify({ event, ...payload }), "*");
  } catch (e) {
    console.error("[Reform] Failed to send message to parent:", e);
  }
};

const FormNotFound = () => {
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
};

const FormNotPublished = () => {
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
};

export const PublicFormPage = ({
  form,
  error,
  formId,
  gated,
  isPopup = false,
  embedConfig = defaultPublicFormEmbedConfig,
  themeToggle,
}: PublicFormPageProps) => {
  const transparentBackground = embedConfig.background === "transparent";
  const hideTitle = embedConfig.title === "hidden";
  const alignLeft = embedConfig.alignment === "left";
  const dynamicHeight = embedConfig.dynamicHeight;
  const dynamicWidth = embedConfig.dynamicWidth;
  const containerRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(() => {
    if (form?.settings?.preventDuplicateSubmissions) {
      try {
        return localStorage.getItem(`bf-submitted-${formId}`) === "1";
      } catch {
        // localStorage unavailable
      }
    }
    return false;
  });

  const resolvedLanguage = form?.settings?.language ?? "English";

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
    async (values: Record<string, unknown>) => {
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
          setSubmitted(true);
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
  // Handle gated states (closed, date expired, limit reached) — check before !form
  // because the server returns form: null for closed forms
  if (gated && gated.type !== "password_required") {
    return (
      <TranslationProvider language={resolvedLanguage}>
        <FormClosed message={gated.message} />
      </TranslationProvider>
    );
  }

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
        "overflow-x-hidden text-foreground",
        // Reserve space at the bottom for the fixed branding footer when shown
        settings.branding ? "pb-16" : "pb-8",
        form.customization && Object.keys(form.customization).length > 0 && "bf-themed",
        // Don't apply min-h-screen for popup or dynamic-height embeds — it
        // stretches the form to 100vh of the iframe viewport, creating a
        // second inner scrollbar on top of the host page's scroll.
        !isPopup && !dynamicHeight && "min-h-screen",
        transparentBackground || isPopup ? "bg-transparent" : "bg-background",
        alignLeft && "text-left",
      )}
      style={dynamicWidth ? ({ "--bf-page-width": "100%" } as React.CSSProperties) : undefined}
      aria-live="polite"
    >
      {themeToggle && (
        <div className="fixed right-4 top-4 z-50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              themeToggle.current === "dark" ? "Switch to light theme" : "Switch to dark theme"
            }
            onClick={() => themeToggle.onChange(themeToggle.current === "dark" ? "light" : "dark")}
            className="rounded-full bg-background/80 backdrop-blur border border-border/60 shadow-sm"
          >
            {themeToggle.current === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      <FormPreviewFromPlate
        content={form.content as Value}
        title={hideTitle ? undefined : form.title}
        icon={hideTitle ? undefined : (form.icon ?? undefined)}
        cover={hideTitle ? undefined : (form.cover ?? undefined)}
        onSubmit={handleSubmit}
        hideTitle={hideTitle}
        settings={settings}
        formId={formId}
        customization={form.customization}
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
};
