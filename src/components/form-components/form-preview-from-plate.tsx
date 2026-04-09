import { StaticContentBlock } from "@/components/form-components/static-content-block";
import { StepForm } from "@/components/form-components/step-form";
import { ProgressBar } from "@/routes/forms/-components/progress-bar";
import { Button } from "@/components/ui/button";
import { StepFormProvider, useStepForm } from "@/contexts/step-form-context";
import { useTranslation } from "@/contexts/translation-context";
import { CUSTOMIZATION_AUTO_DEFAULTS } from "@/lib/theme/customization-defaults";
import { extractFormHeader } from "@/lib/editor/transform-plate-to-form";
import { transformPlateForPreview } from "@/lib/editor/transform-plate-for-preview";
import type { PreviewSegment } from "@/lib/editor/transform-plate-for-preview";
import { DEFAULT_ICON } from "@/lib/config/app-config";
import { cn, isValidUrl } from "@/lib/utils";
import type { PublicFormSettings } from "@/types/form-settings";
import { IconPickerPreview } from "@/components/icon-picker";
import { AnimatePresence, motion } from "motion/react";
import type { Value } from "platejs";
import { useEffect, useMemo, useRef, useState } from "react";

const SuccessCheckmarkIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-green-600"
  >
    <title>Success checkmark</title>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const NoContentPlaceholderIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-auto mb-4 opacity-50"
  >
    <title>No content placeholder</title>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

interface FormPreviewFromPlateProps {
  /** Plate editor content array */
  content: Value;
  /** Optional form title to display */
  title?: string;
  /** Optional icon emoji, URL, or 'default-icon' */
  icon?: string;
  /** Optional cover image URL or hex color code */
  cover?: string;
  /** Optional custom submit handler */
  onSubmit?: (values: Record<string, unknown>) => Promise<void>;
  /** Whether to hide the form title */
  hideTitle?: boolean;
  /** Layout variant */
  layout?: "public" | "editor";
  /** Form settings for public forms */
  settings?: PublicFormSettings;
  /** Form ID for localStorage persistence */
  formId?: string;
  /** Form customization record for theming */
  customization?: Record<string, string> | null;
}

const isHexColor = (str: string): boolean => /^#([0-9A-Fa-f]{3}){1,2}$/.test(str);

const PAGE_MAX_WIDTH = {
  editor: `var(--bf-page-width, ${CUSTOMIZATION_AUTO_DEFAULTS.pageWidth})`,
  public: `var(--bf-page-width, ${CUSTOMIZATION_AUTO_DEFAULTS.pageWidth})`,
} as const;

/**
 * Form header component with proper icon and cover handling
 * Matches the editor's form-header.tsx rendering patterns
 */
const PreviewFormHeader = ({
  title,
  icon,
  iconColor,
  cover,
  hideTitle,
  layout,
  customization,
}: {
  title?: string;
  icon?: string;
  iconColor?: string | null;
  cover?: string;
  hideTitle?: boolean;
  layout: "public" | "editor";
  customization?: Record<string, string> | null;
}) => {
  const [imageError, setImageError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const handleImageError = () => setImageError(true);
  const handleIconError = () => setIconError(true);
  const headerRef = useRef<HTMLDivElement>(null);

  const hasCustomization = !!(customization && Object.keys(customization).length > 0);
  const isLogoMinimal =
    hasCustomization && !!customization?.logoWidth && Number.parseInt(customization.logoWidth) <= 0;
  const logoCircleSize =
    hasCustomization && customization?.logoWidth
      ? String(Math.max(48, Number.parseInt(customization.logoWidth)))
      : "100";

  // Check if we have valid cover (URL or hex color)
  const hasCover = cover && (isHexColor(cover) || isValidUrl(cover)) && !imageError;
  const hasIcon = !!icon && !iconError;
  const hasTitle = title && title.trim().length > 0 && !hideTitle;

  if (!hasCover && !hasIcon && !hasTitle) {
    return null;
  }

  // Full-bleed cover using viewport-width trick (matches editor's form-header-node.tsx)
  const coverClass =
    "relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[120px] sm:h-[200px]";

  // Render cover - can be image or solid color
  const renderCover = () => {
    if (!cover) return null;

    if (isHexColor(cover)) {
      // Render as solid color background
      return <div className={coverClass} data-bf-cover style={{ backgroundColor: cover }} />;
    }

    if (isValidUrl(cover) && !imageError) {
      // Render as image
      return (
        <div className={cn(coverClass, "overflow-hidden bg-muted")} data-bf-cover>
          {cover.includes("tint=true") && (
            <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
          )}
          <img
            src={cover}
            alt="Form cover"
            width={1200}
            height={200}
            className={cn(
              "w-full h-full object-cover",
              cover.includes("tint=true") && "relative z-0 brightness-60 grayscale",
            )}
            onError={handleImageError}
          />
        </div>
      );
    }

    return null;
  };

  // Render icon - can be default-icon, sprite icon name, or image URL
  const iconWrapClass = cn("relative z-10 mb-1", hasCover ? "-mt-[50px]" : "mt-4 sm:mt-6");

  const renderIcon = () => {
    if (!icon) return null;

    // Handle 'default-icon'
    if (icon === DEFAULT_ICON) {
      return (
        <div className={iconWrapClass} data-bf-logo-emoji-container={hasCover ? "true" : undefined}>
          <span data-bf-logo-icon={isLogoMinimal ? "minimal" : ""}>
            <IconPickerPreview
              icon={null}
              iconColor={undefined}
              useThemeColor
              iconSize="48"
              size={logoCircleSize}
            />
          </span>
        </div>
      );
    }

    // Handle image URL
    if (isValidUrl(icon) && !iconError) {
      return (
        <div className={iconWrapClass} data-bf-logo-container={hasCover ? "true" : undefined}>
          <img
            src={icon}
            alt="Form icon"
            width={120}
            height={120}
            className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-md object-cover"
            data-bf-logo
            onError={handleIconError}
          />
        </div>
      );
    }

    // Handle sprite icon name
    return (
      <div className={iconWrapClass} data-bf-logo-emoji-container={hasCover ? "true" : undefined}>
        <span data-bf-logo-icon={isLogoMinimal ? "minimal" : ""}>
          <IconPickerPreview
            icon={icon}
            iconColor={iconColor || undefined}
            useThemeColor={!iconColor}
            iconSize="48"
            size={logoCircleSize}
          />
        </span>
      </div>
    );
  };

  if (layout === "editor") {
    return (
      <div ref={headerRef} className="mb-4 sm:mb-8 w-full">
        {hasCover && renderCover()}
        <div
          className="mx-auto w-full px-8 md:px-0"
          style={{ maxWidth: PAGE_MAX_WIDTH.editor }}
          data-bf-form-container
        >
          {hasIcon && renderIcon()}
          {/* Spacer matching the editor's hover toolbar (Customize / Add icon / Add cover buttons + margin) */}
          <div
            className={cn(
              "flex gap-1 mb-2",
              !hasCover && !hasIcon && "mt-8 sm:mt-12",
              hasCover && !hasIcon && "mt-4",
              !hasCover && hasIcon && "mt-0",
            )}
          >
            <div className="h-8" />
          </div>
          {hasTitle && (
            <h1
              data-bf-title
              style={{ textWrap: "pretty" }}
              className="text-4xl sm:text-[48px] font-serif font-light -tracking-[0.03em] text-foreground"
            >
              {title}
            </h1>
          )}
        </div>
      </div>
    );
  }

  // For public layout, no negative margin tricks needed
  return (
    <div ref={headerRef} className="mb-4 sm:mb-8 w-full">
      {hasCover && renderCover()}

      <div
        className="mx-auto px-4"
        style={{ maxWidth: PAGE_MAX_WIDTH.public }}
        data-bf-form-container
      >
        <div className="flex flex-col">
          {hasIcon && renderIcon()}
          {hasTitle && (
            <h1
              data-bf-title
              style={{ textWrap: "pretty" }}
              className={`text-4xl sm:text-[48px] font-serif font-light -tracking-[0.03em] text-foreground ${hasIcon ? "mt-3 sm:mt-4" : "mt-6 sm:mt-8"}`}
            >
              {title}
            </h1>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders custom thank you content after form submission.
 * Thank-you page is static-only — rendered entirely via PlateStatic.
 */
const RenderThankYouContent = ({ nodes, onReset }: { nodes: Value; onReset?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div data-bf-field-list className="space-y-4">
      <StaticContentBlock nodes={nodes} />
      {onReset && (
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            onClick={onReset}
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            {t("submitAnother")}
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Default thank you message when no custom content is provided
 */
const DefaultThankYou = ({ onReset }: { onReset?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        {SuccessCheckmarkIcon}
      </div>
      <h2 className="text-2xl font-bold mb-2">{t("thankYou")}</h2>
      <p className="text-muted-foreground mb-6">{t("responseSubmitted")}</p>
      {onReset && (
        <Button type="button" onClick={onReset} variant="outline" size="sm" className="rounded-lg">
          {t("submitAnother")}
        </Button>
      )}
    </div>
  );
};

/**
 * Renders Plate editor content as a functional form preview.
 * Supports multi-step forms with page breaks as step dividers.
 * Uses separate forms per step with StepFormContext for state management.
 *
 * Static content (headings, paragraphs, blockquotes, code blocks, etc.)
 * is rendered via PlateStatic for full rich-text fidelity.
 * Form fields (Input, Textarea, Button) use custom form components.
 */
export const FormPreviewFromPlate = ({
  content,
  title: legacyTitle,
  icon: legacyIcon,
  cover: legacyCover,
  onSubmit,
  hideTitle,
  layout = "public",
  settings,
  formId,
  customization,
}: FormPreviewFromPlateProps) => {
  const headerFromContent = useMemo(() => extractFormHeader(content), [content]);
  const hasHeaderNode = headerFromContent !== null;

  const title = hideTitle ? "" : hasHeaderNode ? headerFromContent.title : legacyTitle;
  const icon = hasHeaderNode ? (headerFromContent.icon ?? undefined) : legacyIcon;
  const iconColor = hasHeaderNode ? headerFromContent.iconColor : null;
  const cover = hasHeaderNode ? (headerFromContent.cover ?? undefined) : legacyCover;

  // Transform Plate content into chunked preview segments
  const { steps, thankYouNodes } = useMemo(() => transformPlateForPreview(content), [content]);

  // Show placeholder if no segments found
  if (steps.length === 0 || steps.flat().length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <div className="text-muted-foreground mb-4">{NoContentPlaceholderIcon}</div>
        <h3 className="text-lg mb-2">No Content Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Add content to the editor to see the preview.
        </p>
      </div>
    );
  }

  return (
    <StepFormProvider
      totalSteps={steps.length}
      onSubmit={onSubmit}
      formId={formId}
      saveAnswersForLater={settings?.saveAnswersForLater}
    >
      <FormPreviewContent
        steps={steps}
        thankYouNodes={thankYouNodes}
        title={title}
        icon={icon}
        iconColor={iconColor}
        cover={cover}
        hideTitle={hideTitle}
        layout={layout}
        settings={settings}
        customization={customization}
      />
    </StepFormProvider>
  );
};

/**
 * Animation variants for form step transitions
 */
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 20 : -20,
    opacity: 0,
  }),
};

/**
 * Inner content component that uses StepFormContext
 */
const FormPreviewContent = ({
  steps,
  thankYouNodes,
  title,
  icon,
  iconColor,
  cover,
  hideTitle,
  layout,
  settings,
  customization,
}: {
  steps: PreviewSegment[][];
  thankYouNodes: Value | null;
  title?: string;
  icon?: string;
  iconColor?: string | null;
  cover?: string;
  hideTitle?: boolean;
  layout: "public" | "editor";
  settings?: PublicFormSettings;
  customization?: Record<string, string> | null;
}) => {
  const { currentStep, totalSteps, isSubmitted, direction, reset } = useStepForm();
  const { t } = useTranslation();
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Handle redirect on completion
  useEffect(() => {
    if (!isSubmitted) return;
    if (!settings?.redirectOnCompletion || !settings?.redirectUrl) return;

    const delay = settings.redirectDelay ?? 0;

    if (delay === 0) {
      // Immediate redirect
      window.location.href = settings.redirectUrl;
      return;
    }

    // Start countdown
    setRedirectCountdown(delay);

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (settings.redirectUrl) {
            window.location.href = settings.redirectUrl;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, settings?.redirectOnCompletion, settings?.redirectUrl, settings?.redirectDelay]);

  // Show thank you content after submission
  if (isSubmitted) {
    return (
      <div className="w-full">
        <PreviewFormHeader
          title={title}
          icon={icon}
          iconColor={iconColor}
          cover={cover}
          hideTitle={hideTitle}
          layout={layout}
          customization={customization}
        />
        <div
          className={cn("w-full mx-auto", layout === "editor" ? "px-8 md:px-0" : "px-4")}
          style={{ maxWidth: PAGE_MAX_WIDTH[layout] }}
          data-bf-form-container
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {thankYouNodes && thankYouNodes.length > 0 ? (
              <RenderThankYouContent nodes={thankYouNodes} onReset={reset} />
            ) : (
              <DefaultThankYou onReset={reset} />
            )}
            {redirectCountdown !== null && (
              <p className="text-muted-foreground text-center mt-4">
                {t("redirecting", {
                  n: redirectCountdown,
                  s: redirectCountdown !== 1 ? "s" : "",
                })}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === steps.length - 1;
  const currentStepSegments = steps[currentStep] || [];

  return (
    <div className="w-full">
      {/* Header Section */}
      <PreviewFormHeader
        title={title}
        icon={icon}
        cover={cover}
        hideTitle={hideTitle}
        layout={layout}
        customization={customization}
      />

      {/* Progress Bar */}
      {settings?.progressBar && totalSteps > 1 && (
        <div
          className={cn("mb-6 mx-auto", layout === "editor" ? "w-full px-8 md:px-0" : "px-4")}
          style={{ maxWidth: PAGE_MAX_WIDTH[layout] }}
          data-bf-form-container
        >
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      )}

      {/* Step Form */}
      <div
        className={cn("mx-auto", layout === "editor" ? "w-full px-8 md:px-0" : "px-4")}
        style={{
          maxWidth: PAGE_MAX_WIDTH[layout],
          ...(layout === "editor"
            ? ({ "--bf-spacing": "0.5rem" } as React.CSSProperties)
            : undefined),
        }}
        data-bf-form-container
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full"
          >
            <StepForm
              key={currentStep}
              stepIndex={currentStep}
              segments={currentStepSegments}
              isLastStep={isLastStep}
              autoJump={settings?.autoJump}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
