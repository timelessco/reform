import { FileQuestionIcon, LockIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { Value } from "platejs";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
// Lazy: pulls StaticContentBlock → platejs runtime + BaseEditorKit + Plate CSS
// (~370 kB). The RSC path renders static content server-side, so this fallback
// only runs when `rsc` is unavailable.
const FormPreviewFromPlate = lazy(() =>
  import("@/components/form-components/form-preview-from-plate").then((m) => ({
    default: m.FormPreviewFromPlate,
  })),
);
import { FormPreviewRSC } from "@/components/form-components/form-preview-rsc";
import type { StepRSC } from "@/components/form-components/form-preview-rsc";
import { BrandingFooter } from "./branding-footer";
import { AlreadySubmitted, FormClosed } from "@/routes/forms/-components/form-closed";
import { PasswordGate } from "@/routes/forms/-components/password-gate";
import { TranslationProvider, useTranslation } from "@/contexts/translation-context";
import { createPublicSubmission, getPublicDraft } from "@/lib/server-fn/public-submissions";
import { clearDraftId, readDraftId } from "@/hooks/use-draft-autosave";
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
  // When present, renders via FormPreviewRSC — static prose is server-rendered
  // so the client bundle no longer ships platejs/static.
  rsc?: {
    steps: StepRSC[];
    thankYou?: unknown;
    stepCount: number;
    /** Pre-rendered header composite (cover + icon + title). */
    header?: unknown;
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
  rsc,
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

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Resume-after-refresh state machine. "prompt": draft fetched, banner shown.
  // "resumed": user accepted; StepFormProvider remounts via the `key` prop.
  // "dismissed": user clicked Start over (or no draft existed).
  type DraftPayload = { data: Record<string, unknown>; lastStepReached: number | null };
  type DraftState =
    | { status: "loading" }
    | { status: "prompt"; draft: DraftPayload }
    | { status: "resumed"; draft: DraftPayload }
    | { status: "dismissed" };
  const [draftState, setDraftState] = useState<DraftState>({ status: "loading" });

  useEffect(() => {
    const draftId = readDraftId(formId);
    if (!draftId) {
      setDraftState({ status: "dismissed" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getPublicDraft({ data: { formId, draftId } });
        if (cancelled) return;
        if (!res.draft) {
          setDraftState({ status: "dismissed" });
          return;
        }
        setDraftState({
          status: "prompt",
          draft: { data: res.draft.data, lastStepReached: res.draft.lastStepReached },
        });
      } catch (err) {
        console.error("[Reform] Failed to load draft:", err);
        setDraftState({ status: "dismissed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const handleResumeDraft = useCallback(() => {
    setDraftState((s) => (s.status === "prompt" ? { status: "resumed", draft: s.draft } : s));
  }, []);

  const handleStartOver = useCallback(() => {
    clearDraftId(formId);
    setDraftState({ status: "dismissed" });
  }, [formId]);

  const resumed = draftState.status === "resumed";
  const resumeProps = resumed
    ? {
        initialFormData: draftState.draft.data,
        initialCurrentStep: draftState.draft.lastStepReached ?? 0,
      }
    : {};
  const previewKey = resumed ? "resumed" : "fresh";

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
      setSubmitError(null);
      try {
        // Carry the draftId forward so the server updates the existing draft
        // row in place (preserves submissionId, notifications fire once).
        const draftId = readDraftId(formId) ?? undefined;
        await createPublicSubmission({
          data: {
            formId,
            data: values,
            isCompleted: true,
            draftId,
          },
        });

        // Completed: drop the localStorage pointer so a fresh visit starts a
        // fresh draft instead of resuming the one that just finalized.
        clearDraftId(formId);

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
        setSubmitError(getTranslations(resolvedLanguage).submitFailed);
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
    <main
      ref={containerRef}
      id="bf-form-container"
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
            aria-label="Toggle color theme"
            onClick={() => themeToggle.onChange(themeToggle.current === "dark" ? "light" : "dark")}
            className="rounded-full bg-background/80 backdrop-blur border border-border/60 shadow-sm"
          >
            {/* Render both icons; the pre-hydration script sets `.dark` on the
                root before paint, so CSS picks the right one. Doing this in
                React state would mismatch SSR (server can't know the viewer's
                system preference), triggering a full-tree re-render that
                presents as a ~1s layout shift after hydration. */}
            <SunIcon className="hidden h-4 w-4 dark:block" />
            <MoonIcon className="block h-4 w-4 dark:hidden" />
          </Button>
        </div>
      )}
      {draftState.status === "prompt" && (
        <div
          role="status"
          className="mx-auto mb-4 mt-4 flex max-w-xl items-center justify-between gap-4 rounded-md border border-border bg-muted/60 px-4 py-3 text-sm"
        >
          <span className="text-foreground">We restored your in-progress answers.</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleResumeDraft}>
              Resume
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleStartOver}>
              Start over
            </Button>
          </div>
        </div>
      )}
      {rsc ? (
        <FormPreviewRSC
          key={previewKey}
          steps={rsc.steps}
          thankYou={(rsc.thankYou as string | null) ?? null}
          stepCount={rsc.stepCount}
          header={hideTitle ? null : rsc.header}
          onSubmit={handleSubmit}
          settings={settings}
          formId={formId}
          {...resumeProps}
        />
      ) : (
        <Suspense fallback={null}>
          <FormPreviewFromPlate
            key={previewKey}
            content={form.content as Value}
            title={hideTitle ? undefined : form.title}
            icon={hideTitle ? undefined : (form.icon ?? undefined)}
            cover={hideTitle ? undefined : (form.cover ?? undefined)}
            onSubmit={handleSubmit}
            hideTitle={hideTitle}
            settings={settings}
            formId={formId}
            customization={form.customization}
            {...resumeProps}
          />
        </Suspense>
      )}
      {submitError && (
        <div
          aria-live="assertive"
          role="alert"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-sm"
        >
          {submitError}
        </div>
      )}
      {settings.branding && <BrandingFooter />}
    </main>
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
