import { Link, useSearch } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useMemo } from "react";
import type { Value } from "platejs";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { Button } from "@/components/ui/button";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { useForm, useFormSettings } from "@/hooks/use-live-hooks";
import { getThemeStyleVars } from "@/lib/generate-theme-css";
import { cn } from "@/lib/utils";

export function PreviewMode({ formId, workspaceId }: { formId: string; workspaceId: string }) {
  const { data: savedDocs, isLoading } = useForm(formId);
  const { data: formSettings } = useFormSettings(formId);
  const customization = formSettings?.customization as Record<string, string> | null;
  const hasCustomization = customization && Object.keys(customization).length > 0;
  const themeVars = useMemo(() => getThemeStyleVars(customization), [customization]);
  const doc = savedDocs?.[0];
  const content = (doc?.content as Value) || [];

  // Read embed config from search params
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const embedType = (search.embedType as EmbedType) ?? "fullpage";
  const hideTitle = (search.embedHideTitle as boolean) ?? false;
  const transparentBackground = (search.embedTransparent as boolean) ?? false;
  const branding = (search.embedBranding as boolean) ?? true;
  const height = (search.embedHeight as number) ?? 558;
  const dynamicHeight = (search.embedDynamicHeight as boolean) ?? true;
  const popupPosition = (search.embedPopupPosition as string) ?? "bottom-right";
  const popupWidth = (search.embedPopupWidth as number) ?? 376;
  const darkOverlay = (search.embedDarkOverlay as boolean) ?? false;

  if (!isLoading && savedDocs !== undefined && savedDocs.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Form Not Found</h2>
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
        "w-full h-full flex flex-col transition-colors duration-300",
        embedType === "fullpage"
          ? cn(
              transparentBackground ? "bg-transparent" : "bg-background",
              "overflow-y-auto overflow-x-hidden",
            )
          : "bg-background text-foreground overflow-hidden",
      )}
      style={hasCustomization ? themeVars : undefined}
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

                  {/* The form itself */}
                  <div className="relative group/embed">
                    {/* Minimal indicator */}
                    {embedType === "standard" && (
                      <div className="absolute -top-5 right-0 text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest pointer-events-none">
                        Embedded State
                      </div>
                    )}

                    <div
                      className={cn(
                        "w-full transition-all duration-500",
                        embedType === "standard" || embedType === "popup"
                          ? "bg-transparent border-2 border-dashed border-border rounded-lg overflow-hidden"
                          : "bg-background rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-border",
                      )}
                      style={{
                        height: dynamicHeight ? "auto" : height,
                      }}
                    >
                      <div
                        className={cn(
                          "w-full h-full",
                          !dynamicHeight
                            ? "overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 p-8"
                            : "p-8 md:p-12",
                        )}
                      >
                        <FormPreviewFromPlate
                          content={content}
                          title={hideTitle ? "" : doc.title}
                          icon={doc.icon ?? undefined}
                          cover={doc.cover ?? undefined}
                          onSubmit={async () => {}}
                          hideTitle={hideTitle}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 opacity-20">
                    <div className="w-full h-1.5 bg-muted/50 rounded-full" />
                    <div className="w-3/4 h-1.5 bg-muted/50 rounded-full" />
                  </div>

                  {/* Branding */}
                  {branding && <BrandingBadge />}
                </div>
              </div>
            </div>

            {/* Popup overlay and floating popup */}
            {embedType === "popup" && (
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {darkOverlay && (
                  <div className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-300 pointer-events-auto" />
                )}

                <div
                  className={cn(
                    "absolute bg-background rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-border overflow-hidden flex flex-col transition-all duration-300 z-20 pointer-events-auto",
                    popupPosition === "center"
                      ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      : popupPosition === "bottom-left"
                        ? "bottom-12 left-12"
                        : "bottom-12 right-12",
                  )}
                  style={{ width: popupWidth }}
                >
                  {/* Close button */}
                  <div className="absolute top-4 right-4 z-30 pointer-events-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full shadow-sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Popup form content */}
                  <div className="overflow-y-auto max-h-[650px]">
                    <FormPreviewFromPlate
                      content={content}
                      title={hideTitle ? "" : doc.title}
                      icon={doc.icon ?? undefined}
                      cover={doc.cover ?? undefined}
                      onSubmit={async () => {}}
                      hideTitle={hideTitle}
                    />
                  </div>

                  {/* Popup branding */}
                  {branding && (
                    <div className="py-3 flex justify-center bg-primary/10 border-t border-border shrink-0">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                        <span>Made with</span>
                        <Sparkles className="h-3 w-3 fill-primary text-primary" />
                        <span>Better Forms</span>
                      </div>
                    </div>
                  )}
                </div>
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
              title={hideTitle ? "" : doc.title}
              icon={doc.icon ?? undefined}
              cover={doc.cover ?? undefined}
              onSubmit={async () => {}}
              hideTitle={hideTitle}
              layout="editor"
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
}

function BrandingBadge() {
  return (
    <div className="flex justify-end pt-6">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-default border border-border/50">
        <span>Made with</span>
        <Sparkles className="h-3 w-3 fill-muted-foreground/50 text-muted-foreground/50" />
        <span>Better Forms</span>
      </div>
    </div>
  );
}
