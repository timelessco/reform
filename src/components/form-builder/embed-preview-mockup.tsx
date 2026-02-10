import type { Value } from "platejs";
import { Sparkles } from "lucide-react";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import {
  transformPlateStateToFormElements,
  splitElementsIntoSteps,
} from "@/lib/transform-plate-to-form";
import { cn } from "@/lib/utils";

interface EmbedPreviewMockupProps {
  embedType: EmbedType;
  popupPosition?: "bottom-right" | "bottom-left" | "center";
  content?: Value;
  title?: string;
  icon?: string;
  cover?: string;
  branding?: boolean;
  transparent?: boolean;
  hideTitle?: boolean;
  emojiIcon?: string;
  emojiAnimation?: "wave" | "bounce" | "pulse";
}

export function EmbedPreviewMockup({
  embedType = "fullpage",
  popupPosition = "bottom-right",
  content = [],
  title = "Untitled Form",
  branding = true,
  transparent = false,
  hideTitle = false,
  icon,
  cover,
  emojiIcon,
  emojiAnimation = "wave",
}: EmbedPreviewMockupProps) {
  return (
    <div className="rounded-xl border bg-muted/20 overflow-hidden shadow-sm">
      {/* Browser Chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/40 backdrop-blur-sm">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-400/60" />
          <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <div className="h-2 w-2 rounded-full bg-green-400/60" />
        </div>
        <div className="flex-1 mx-2">
          <div className="h-3.5 bg-muted/60 rounded-full max-w-[140px]" />
        </div>
      </div>

      {/* Content Area */}
      <div className={cn(
        "relative h-[240px] transition-colors duration-300 overflow-hidden",
        transparent && embedType === "standard" ? "bg-muted/10" : "bg-background/50"
      )}>
        <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-none p-4 pb-8">
          {embedType === "standard" && (
            <StandardPreview
              content={content}
              title={title}
              branding={branding}
              transparent={transparent}
              hideTitle={hideTitle}
              icon={icon}
              cover={cover}
            />
          )}
          {embedType === "popup" && (
            <PopupPreview
              position={popupPosition}
              content={content}
              title={title}
              branding={branding}
              hideTitle={hideTitle}
              icon={icon}
              cover={cover}
              emojiIcon={emojiIcon}
              emojiAnimation={emojiAnimation}
            />
          )}
          {embedType === "fullpage" && (
            <FullPagePreview
              content={content}
              title={title}
              branding={branding}
              transparent={transparent}
              hideTitle={hideTitle}
              icon={icon}
              cover={cover}
            />
          )}
        </div>

        {/* Scroll indicator - simple fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-background/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

function FormSkeleton({
  content,
  title,
  icon,
  cover,
  hideTitle,
  size = "md",
}: {
  content: Value;
  title: string;
  icon?: string;
  cover?: string;
  hideTitle?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const elements = transformPlateStateToFormElements(content);
  const { steps } = splitElementsIntoSteps(elements);
  const currentStepElements = steps[0] || [];

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-500">
      {/* Cover Skeleton */}
      {cover && (
        <div
          className={cn(
            "w-full rounded-lg mb-4 bg-muted/30",
            size === "sm" ? "h-8" : size === "md" ? "h-12" : "h-16"
          )}
          style={{ backgroundColor: cover.startsWith("#") ? cover : undefined }}
        >
          {cover.startsWith("http") && (
            <div className="w-full h-full bg-muted/40 animate-pulse rounded-lg" />
          )}
        </div>
      )}

      {/* Icon & Title Skeleton */}
      <div className="space-y-3">
        {icon && (
          <div className={cn(
            "rounded-md bg-muted/20 flex items-center justify-center",
            size === "sm" ? "h-6 w-6 text-xs" : "h-10 w-10 text-xl",
            cover ? "-mt-8 ml-2 border-2 border-background" : ""
          )}>
            {icon.length <= 4 ? icon : "📄"}
          </div>
        )}
        {!hideTitle && (
          <div className={cn(
            "bg-foreground/10 rounded-full",
            size === "sm" ? "h-3 w-1/2" : "h-5 w-2/3"
          )}>
            <span className="sr-only">{title}</span>
          </div>
        )}
      </div>

      {/* Fields Skeleton */}
      <div className="space-y-4 pt-2">
        {currentStepElements.length > 0 ? (
          currentStepElements.slice(0, 5).map((el) => (
            <div key={el.id} className="space-y-1.5">
              <div className="h-2 bg-muted/40 rounded-full w-1/4" />
              <div className={cn(
                "bg-muted/20 rounded-md border border-muted/30",
                el.fieldType === "Textarea" ? "h-12" : "h-8"
              )} />
            </div>
          ))
        ) : (
          // Default placeholders if content is empty
          <>
            <div className="space-y-1.5">
              <div className="h-2 bg-muted/40 rounded-full w-1/4" />
              <div className="h-8 bg-muted/20 rounded-md border border-muted/30" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-muted/40 rounded-full w-1/3" />
              <div className="h-8 bg-muted/20 rounded-md border border-muted/30" />
            </div>
          </>
        )}
        {/* Submit Button */}
        <div className="pt-2">
          <div className="h-8 bg-primary/20 rounded-md w-1/3 ml-auto border border-primary/10" />
        </div>
      </div>
    </div>
  );
}

function StandardPreview({
  content,
  title,
  icon,
  cover,
  branding,
  transparent,
  hideTitle,
}: any) {
  return (
    <div className="space-y-6">
      {/* Mock Website Background */}
      <div className="space-y-2 opacity-50">
        <div className="h-2 bg-muted/60 rounded-full w-1/3" />
        <div className="h-1.5 bg-muted/40 rounded-full w-full" />
        <div className="h-1.5 bg-muted/40 rounded-full w-4/5" />
      </div>

      {/* Embedded Form */}
      <div className={cn(
        "w-full rounded-xl transition-all duration-300",
        transparent
          ? "bg-transparent border-2 border-dashed border-muted-foreground/20 p-4"
          : "bg-background border shadow-sm p-4"
      )}>
        <FormSkeleton
          content={content}
          title={title}
          icon={icon}
          cover={cover}
          hideTitle={hideTitle}
          size="sm"
        />
      </div>

      {/* Branding */}
      {branding && <BrandingBadge size="sm" />}

      <div className="space-y-2 opacity-30 pt-2">
        <div className="h-1.5 bg-muted/40 rounded-full w-full" />
        <div className="h-1.5 bg-muted/40 rounded-full w-full" />
      </div>
    </div>
  );
}

function PopupPreview({ position, content, title, icon, cover, branding, hideTitle, emojiIcon, emojiAnimation }: any) {
  return (
    <div className="relative min-h-full">
      {/* Page Content Wireframe */}
      <div className="space-y-3 opacity-30">
        <div className="h-3 bg-muted/60 rounded-full w-1/4" />
        <div className="space-y-1.5">
          <div className="h-2 bg-muted/40 rounded-full w-full" />
          <div className="h-2 bg-muted/40 rounded-full w-full" />
          <div className="h-2 bg-muted/40 rounded-full w-3/4" />
        </div>
        <div className="h-24 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/10" />
        <div className="h-2 bg-muted/40 rounded-full w-full" />
      </div>

      {/* Popup Card */}
      <div
        className={cn(
          "absolute w-[70%] max-w-[200px] rounded-xl border bg-background shadow-2xl p-3 z-10 animate-in slide-in-from-bottom-2 duration-500",
          position === "center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : position === "bottom-left"
              ? "bottom-0 left-0"
              : "bottom-0 right-0",
        )}
      >
        {/* Animated Emoji Icon */}
        {emojiIcon && (
          <div
            className={cn(
              "absolute -top-8 text-2xl",
              position === "bottom-left" ? "left-2" : "right-2",
              emojiAnimation === "wave" && "animate-wave",
              emojiAnimation === "bounce" && "animate-bounce",
              emojiAnimation === "pulse" && "animate-pulse"
            )}
          >
            {emojiIcon}
          </div>
        )}
        <FormSkeleton
          content={content}
          title={title}
          icon={icon}
          cover={cover}
          hideTitle={hideTitle}
          size="sm"
        />
        {branding && (
          <div className="mt-4 pt-2 border-t flex justify-center">
            <BrandingBadge size="xs" />
          </div>
        )}
      </div>
    </div>
  );
}

function FullPagePreview({ content, title, icon, cover, branding, transparent, hideTitle }: any) {
  return (
    <div className={cn(
      "w-full max-w-[240px] mx-auto transition-all duration-300",
      transparent ? "bg-transparent" : ""
    )}>
      <FormSkeleton
        content={content}
        title={title}
        icon={icon}
        cover={cover}
        hideTitle={hideTitle}
        size="md"
      />
      {branding && (
        <div className="mt-8 flex justify-center opacity-80">
          <BrandingBadge size="sm" />
        </div>
      )}
    </div>
  );
}

function BrandingBadge({ size = "sm" }: { size?: "xs" | "sm" }) {
  return (
    <div className={cn(
      "flex items-center gap-1 font-semibold text-primary/80",
      size === "xs" ? "text-[8px]" : "text-[10px]"
    )}>
      <span>Made with</span>
      <Sparkles className={cn("fill-primary/20", size === "xs" ? "h-2 w-2" : "h-2.5 w-2.5")} />
      <span>Better Forms</span>
    </div>
  );
}
