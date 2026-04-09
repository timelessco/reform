import { APP_NAME, SPRITE_PATH } from "@/lib/config/app-config";
import { Link, useSearch } from "@tanstack/react-router";
import { SparklesIcon, XIcon } from "@/components/ui/icons";
import { iconMap } from "@/components/icon-picker/icon-data";
import { useState, useEffect, useCallback } from "react";
import type { Value } from "platejs";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { Button } from "@/components/ui/button";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { useFormCustomization } from "@/hooks/use-form-customization";
import { useForm } from "@/hooks/use-live-hooks";
import { useResolvedTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const noop = async () => {};

export const PreviewMode = ({ formId, workspaceId }: { formId: string; workspaceId: string }) => {
  const { data: savedDocs, isLoading } = useForm(formId);
  const doc = savedDocs?.[0];

  const resolvedAppTheme = useResolvedTheme();

  const { customization, hasCustomization, themeVars } = useFormCustomization(
    doc,
    resolvedAppTheme,
  );
  const content = (doc?.content as Value) || [];

  // Read embed config from search params
  const search = useSearch({ strict: false });
  const embedType = (search.embedType as EmbedType) ?? "fullpage";
  const hideTitle = (search.embedHideTitle as boolean) ?? false;
  const transparentBackground = (search.embedTransparent as boolean) ?? false;
  const branding = (search.embedBranding as boolean) ?? true;
  const height = (search.embedHeight as number) ?? 558;
  const dynamicHeight = (search.embedDynamicHeight as boolean) ?? true;
  const popupPosition = (search.embedPopupPosition as string) ?? "bottom-right";
  const popupWidth = (search.embedPopupWidth as number) ?? 376;
  const darkOverlay = (search.embedDarkOverlay as boolean) ?? false;
  const showEmoji = (search.embedEmoji as boolean) ?? true;
  const alignLeft = (search.embedAlignLeft as boolean) ?? false;
  const dynamicWidth = (search.embedDynamicWidth as boolean) ?? false;

  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const handleClosePopup = useCallback(() => setIsPopupOpen(false), []);
  const handleOpenPopup = useCallback(() => setIsPopupOpen(true), []);

  // Re-open popup when switching to popup mode
  useEffect(() => {
    if (embedType === "popup") setIsPopupOpen(true);
  }, [embedType]);

  if (!isLoading && savedDocs !== undefined && savedDocs.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg mb-2">Form Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This form does not exist or has been deleted.
          </p>
          <Link to="/workspace/$workspaceId" params={{ workspaceId }}>
            <Button>Back to Workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !doc) {
    return <div className="h-full w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div
      className={cn(
        hasCustomization && "bf-themed",
        resolvedAppTheme === "dark" && "dark",
        "w-full h-full flex flex-col transition-colors duration-300 bg-background text-foreground",
        embedType === "fullpage" ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden",
      )}
      style={{
        ...(hasCustomization ? themeVars : undefined),
        viewTransitionName: "preview-content",
      }}
    >
      {/* Standard & Popup — mock website background */}
      {embedType !== "fullpage" && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col scrollbar-hide">
          <div className="flex-1 relative p-4 lg:p-0">
            <div className="max-w-[1000px] mx-auto pt-4 px-4 lg:px-8 space-y-8">
              {/* Preview label */}
              <div className="flex items-center pt-2">
                <span className="text-muted-foreground/40 font-bold text-[10px] uppercase tracking-widest">
                  Live Preview
                </span>
              </div>

              {/* Mock header bars (Subtle) */}
              <div className="space-y-4 opacity-40">
                <div className="w-20 h-4 bg-muted/50 border border-border/50 rounded-sm" />
                <div className="flex justify-between items-end border-b border-border/30 pb-3">
                  <div className="flex gap-4 lg:gap-6">
                    <div className="w-8 lg:w-10 h-1.5 bg-muted/50 rounded-full" />
                    <div className="w-8 lg:w-10 h-1.5 bg-muted/50 rounded-full" />
                  </div>
                  <div className="w-12 lg:w-14 h-6 bg-muted/30 border border-border/30 rounded-md" />
                </div>
              </div>

              {/* Mock content area */}
              <div className="grid grid-cols-12 gap-4 lg:gap-8 pt-2">
                {/* Mock sidebar (Very Subtle) */}
                <div className="hidden lg:block col-span-3 space-y-5 opacity-30">
                  <div className="w-full h-6 bg-muted/40 rounded-sm" />
                  <div className="space-y-2">
                    <div className="w-full h-1.5 bg-muted/50 rounded-full" />
                    <div className="w-4/5 h-1.5 bg-muted/50 rounded-full" />
                  </div>
                  <div className="w-full h-24 bg-muted/20 border border-dashed border-border/50 rounded-xl" />
                </div>

                {/* Main content area */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                  <div className="space-y-3 opacity-40">
                    <div className="w-2/3 h-5 bg-muted/50 border border-border/50 rounded-sm" />
                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 bg-muted/50 rounded-full" />
                      <div className="w-full h-1.5 bg-muted/50 rounded-full" />
                    </div>
                  </div>

                  {/* The form itself — only for standard embed */}
                  {embedType === "standard" && (
                    <div className="relative group/embed">
                      <div className="absolute -top-5 right-0 text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest pointer-events-none">
                        Embedded State
                      </div>

                      <div
                        className={cn(
                          "w-full transition-all duration-500 border-2 border-dashed border-border rounded-lg overflow-hidden",
                          transparentBackground
                            ? "bg-[repeating-conic-gradient(#e8e8e8_0%_25%,white_0%_50%)] bg-[length:12px_12px]"
                            : "bg-background",
                        )}
                        style={{
                          height: dynamicHeight ? "auto" : height,
                        }}
                      >
                        <div
                          className={cn(
                            "w-full h-full overflow-x-hidden",
                            !dynamicHeight &&
                              "overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20",
                            alignLeft ? "max-w-[600px]" : "",
                          )}
                          style={
                            dynamicWidth
                              ? ({ "--bf-page-width": "100%" } as React.CSSProperties)
                              : undefined
                          }
                        >
                          <FormPreviewFromPlate
                            content={content}
                            title={hideTitle ? "" : (doc.title ?? undefined)}
                            icon={showEmoji ? (doc.icon ?? undefined) : undefined}
                            cover={doc.cover ?? undefined}
                            onSubmit={noop}
                            hideTitle={hideTitle}
                            customization={customization}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 opacity-20">
                    <div className="w-full h-1.5 bg-muted/50 rounded-full" />
                    <div className="w-3/4 h-1.5 bg-muted/50 rounded-full" />
                  </div>

                  {/* Branding */}
                  {branding && <BrandingBadge />}
                </div>
              </div>
            </div>

            {/* Popup overlay, floating popup, and trigger bubble */}
            {embedType === "popup" && (
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {/* Dark overlay — only when popup is open */}
                {darkOverlay && isPopupOpen && (
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-300 pointer-events-auto w-full h-full border-none cursor-default"
                    onClick={handleClosePopup}
                    aria-label="Close preview"
                  />
                )}

                {/* Popup panel */}
                {isPopupOpen && (
                  <div
                    className="absolute bg-background rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-border overflow-hidden flex flex-col z-20 pointer-events-auto transition-[top,left,transform] duration-300 ease-out"
                    style={{
                      width: popupWidth,
                      ...(popupPosition === "center"
                        ? {
                            top: "50%",
                            left: `calc(50% - ${popupWidth / 2}px)`,
                            transform: "translateY(-50%)",
                          }
                        : popupPosition === "bottom-left"
                          ? { top: "100%", left: 48, transform: "translateY(calc(-100% - 48px))" }
                          : {
                              top: "100%",
                              left: `calc(100% - ${popupWidth}px - 48px)`,
                              transform: "translateY(calc(-100% - 48px))",
                            }),
                    }}
                  >
                    {/* Close button */}
                    <div className="absolute top-4 right-4 z-30 pointer-events-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full shadow-sm"
                        onClick={handleClosePopup}
                        aria-label="Close"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Popup form content */}
                    <div className="overflow-y-auto overflow-x-hidden max-h-[650px]">
                      <FormPreviewFromPlate
                        content={content}
                        title={hideTitle ? "" : (doc.title ?? undefined)}
                        icon={showEmoji ? (doc.icon ?? undefined) : undefined}
                        cover={doc.cover ?? undefined}
                        onSubmit={noop}
                        hideTitle={hideTitle}
                        customization={customization}
                      />
                    </div>

                    {/* Popup branding */}
                    {branding && (
                      <div className="py-3 flex justify-center bg-muted/60 border-t border-border shrink-0">
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                          <span>Made with</span>
                          <SparklesIcon className="h-3 w-3 fill-muted-foreground text-muted-foreground" />
                          <span className="text-foreground">{APP_NAME}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Trigger bubble — shown when popup is closed */}
                {!isPopupOpen && (
                  <button
                    type="button"
                    onClick={handleOpenPopup}
                    aria-label="Open form preview"
                    className="absolute z-20 pointer-events-auto w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-[inset] duration-300 ease-out cursor-pointer"
                    style={
                      popupPosition === "bottom-left"
                        ? { bottom: 24, left: 24, right: "auto" }
                        : { bottom: 24, right: "auto", left: "calc(100% - 80px)" }
                    }
                  >
                    {showEmoji && doc.icon && iconMap.has(doc.icon) ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <use href={`${SPRITE_PATH}#${doc.icon}`} />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Page — clean full-screen form */}
      {embedType === "fullpage" && (
        <div
          className={cn(
            "flex-1 flex flex-col transition-colors duration-300",
            transparentBackground ? "bg-transparent" : "bg-background",
          )}
        >
          <div className="flex-1 w-full">
            <FormPreviewFromPlate
              content={content}
              title={hideTitle ? "" : (doc.title ?? undefined)}
              icon={doc.icon ?? undefined}
              cover={doc.cover ?? undefined}
              onSubmit={noop}
              hideTitle={hideTitle}
              layout="editor"
              customization={customization}
            />

            {branding && (
              <div className="mt-20 flex justify-end pb-12">
                <BrandingBadge />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BrandingBadge = () => (
  <div className="flex justify-end pt-6">
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-default border border-border/50">
      <span>Made with</span>
      <SparklesIcon className="h-3 w-3 fill-muted-foreground/50 text-muted-foreground/50" />
      <span>{APP_NAME}</span>
    </div>
  </div>
);
