import { Link, useSearch } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import type { Value } from "platejs";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { Button } from "@/components/ui/button";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { useForm } from "@/hooks/use-live-hooks";
import { cn } from "@/lib/utils";

export function PreviewMode({ formId, workspaceId }: { formId: string; workspaceId: string }) {
  const { data: savedDocs, isLoading } = useForm(formId);
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
    <div className="relative min-h-full overflow-y-auto bg-[#F9FAFB]">
      {/* Standard & Popup — mock website background */}
      {embedType !== "fullpage" && (
        <div className="flex flex-col min-h-full">
          <div className="flex-1 bg-white relative p-4 lg:p-0">
            <div className="max-w-[1000px] mx-auto pt-4 px-4 lg:px-8 space-y-8">
              {/* Preview label */}
              <div className="flex items-center pt-2">
                <span className="text-gray-300 font-bold text-[10px] uppercase tracking-widest">
                  Live Preview
                </span>
              </div>

              {/* Mock header bars */}
              <div className="space-y-5">
                <div className="w-24 h-5 bg-gray-50 border border-gray-100 rounded-sm" />
                <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                  <div className="flex gap-4 lg:gap-6">
                    <div className="w-10 lg:w-12 h-2.5 bg-gray-50/80 rounded-full" />
                    <div className="w-10 lg:w-12 h-2.5 bg-gray-50/80 rounded-full" />
                    <div className="hidden lg:block w-12 h-2.5 bg-gray-50/80 rounded-full" />
                  </div>
                  <div className="w-16 lg:w-20 h-7 bg-gray-100 border border-gray-200/50 rounded-md shadow-sm" />
                </div>
              </div>

              {/* Mock content area */}
              <div className="grid grid-cols-12 gap-4 lg:gap-8 pt-4">
                {/* Mock sidebar */}
                <div className="hidden lg:block col-span-3 space-y-6">
                  <div className="w-full h-7 bg-gray-50/60 rounded-sm" />
                  <div className="space-y-3">
                    <div className="w-full h-2.5 bg-gray-50/80 rounded-full" />
                    <div className="w-4/5 h-2.5 bg-gray-50/80 rounded-full" />
                    <div className="w-2/3 h-2.5 bg-gray-50/80 rounded-full" />
                  </div>
                  <div className="w-full h-32 bg-gray-50/30 border border-dashed border-gray-100 rounded-xl" />
                </div>

                {/* Main content area */}
                <div className="col-span-12 lg:col-span-9 space-y-10">
                  <div className="space-y-4">
                    <div className="w-3/4 lg:w-1/2 h-8 bg-gray-50/70 rounded-lg" />
                    <div className="space-y-2">
                      <div className="w-full h-2.5 bg-gray-50/80 rounded-full" />
                      <div className="w-full h-2.5 bg-gray-50/80 rounded-full" />
                      <div className="w-3/4 h-2.5 bg-gray-50/80 rounded-full" />
                    </div>
                  </div>

                  {/* The form itself */}
                  <div
                    className={cn(
                      "w-full transition-all duration-500 rounded-2xl",
                      transparentBackground
                        ? "bg-transparent"
                        : "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100 p-8",
                    )}
                    style={{ height: dynamicHeight ? "auto" : height }}
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
                    "absolute bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 z-20 pointer-events-auto",
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
                      className="h-8 w-8 hover:bg-black/10 text-gray-400 bg-white/50 backdrop-blur-sm rounded-full shadow-sm"
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
                    <div className="py-3 flex justify-center bg-[#EBF5FF] border-t shrink-0">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0066CC]">
                        <span>Made with</span>
                        <Sparkles className="h-3 w-3 fill-[#0066CC] text-[#0066CC]" />
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
            "min-h-full flex flex-col transition-colors duration-300",
            transparentBackground ? "bg-transparent" : "bg-white",
          )}
        >
          <div className="flex-1 w-full max-w-3xl mx-auto py-12 px-8">
            <FormPreviewFromPlate
              content={content}
              title={hideTitle ? "" : doc.title}
              icon={doc.icon ?? undefined}
              cover={doc.cover ?? undefined}
              onSubmit={async () => {}}
              hideTitle={hideTitle}
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
    <div className="flex justify-end pt-8">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF5FF] rounded-full text-[11px] font-bold text-[#0066CC] hover:scale-105 transition-transform cursor-default shadow-sm border border-blue-50">
        <span>Made with</span>
        <Sparkles className="h-3.5 w-3.5 fill-[#0066CC] text-[#0066CC]" />
        <span>Better Forms</span>
      </div>
    </div>
  );
}
