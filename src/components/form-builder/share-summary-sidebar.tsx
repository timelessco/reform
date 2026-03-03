import { useForm as useTanstackForm } from "@tanstack/react-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Copy, Rocket, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarSection } from "@/components/ui/sidebar-section";
import { useForm } from "@/hooks/use-live-hooks";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { publishForm } from "@/hooks/use-form-versions";
import { cn } from "@/lib/utils";
import type { EmbedOptions } from "./embed-config-panel";
import { defaultEmbedOptions } from "./embed-config-panel";
import { EmbedConfigPanel } from "./embed-config-panel";
import {
  EmbedCodeDialog,
  searchToFormValues,
  formValuesToSearch,
  tabs,
} from "./embed-section";
import { EmbedPreviewMockup } from "./embed-preview-mockup";

interface ShareSummarySidebarProps {
  formId: string;
}

export function ShareSummarySidebar({ formId }: ShareSummarySidebarProps) {
  const { closeSidebar } = useEditorSidebar();
  const { data: savedDocs } = useForm(formId);
  const doc = savedDocs?.[0];

  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  const form = useTanstackForm({
    defaultValues: searchToFormValues(search, doc?.icon),
    listeners: {
      onChange: ({ formApi }) => {
        const v = formApi.state.values;
        navigate({
          search: ((prev: Record<string, unknown>) => ({
            ...prev,
            ...formValuesToSearch(v),
          })) as any,
          replace: true,
        });
      },
      onChangeDebounceMs: 150,
    },
  });

  if (!doc) return null;

  const isDraft = doc.status === "draft";
  const shareUrl = `${window.location.origin}/forms/${doc.id}`;

  const handlePublish = async () => {
    try {
      const tx = publishForm(formId);
      await tx.isPersisted.promise;
      toast.success("Form published successfully!");
    } catch (error) {
      toast.error("Failed to publish form");
      console.error(error);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header */}
      <SidebarHeader className="pt-3 pb-2 shrink-0 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Share</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab bar — only when published */}
        {!isDraft && (
          <form.Field name="embedType">
            {(field) => (
              <div className="bg-secondary rounded-[10px] p-px w-full flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => field.handleChange(tab.value)}
                    className={cn(
                      "flex-1 h-7 rounded-[9px] text-sm font-medium text-center transition-all",
                      field.state.value === tab.value
                        ? "bg-white shadow-[0px_0px_1.5px_0px_rgba(0,0,0,0.16),0px_2px_5px_0px_rgba(0,0,0,0.14)] text-foreground dark:bg-background"
                        : "text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </form.Field>
        )}
      </SidebarHeader>

      {/* Scrollable content */}
      <SidebarContent>
        <div className="p-2">
          {isDraft ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-6 bg-muted/20 border-2 border-dashed rounded-2xl">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Rocket className="h-8 w-8 animate-bounce-subtle" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Ready to go live?</h3>
                <p className="text-xs text-muted-foreground">
                  Your form is currently in draft. Publish it to start
                  collecting responses.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handlePublish}
                className="w-full font-semibold gap-2"
              >
                Publish Now
              </Button>
            </div>
          ) : (
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const embedType = values.embedType;
                const options: EmbedOptions = {
                  height: values.height,
                  dynamicHeight: values.dynamicHeight,
                  hideTitle: values.hideTitle,
                  alignLeft: values.alignLeft,
                  transparentBackground: values.transparentBackground,
                  branding: values.branding,
                  trackEvents: values.trackEvents,
                  customDomain: defaultEmbedOptions.customDomain,
                  popupTrigger: values.popupTrigger,
                  popupPosition: values.popupPosition,
                  popupWidth: values.popupWidth,
                  darkOverlay: values.darkOverlay,
                  emoji: values.emoji,
                  emojiIcon: values.emojiIcon,
                  emojiAnimation: values.emojiAnimation,
                  hideOnSubmit: values.hideOnSubmit,
                  hideOnSubmitDelay: values.hideOnSubmitDelay,
                };

                return (
                  <div className="space-y-3">
                    {/* Preview mockup */}
                    <EmbedPreviewMockup
                      embedType={embedType}
                      popupPosition={options.popupPosition}
                    />

                    {/* Customise section */}
                    <SidebarSection label="Customise" action={<></>}>
                      <EmbedConfigPanel
                        form={form}
                        embedType={embedType}
                        section="customize"
                      />
                    </SidebarSection>

                    {/* Pro Features section */}
                    <SidebarSection label="Pro Features" action={<></>}>
                      <EmbedConfigPanel
                        form={form}
                        embedType={embedType}
                        section="pro"
                      />
                    </SidebarSection>

                    {/* Get Code button — inside scrollable content, after Pro Features */}
                    <Button
                      onClick={() => setCodeDialogOpen(true)}
                      className="w-full h-9 rounded-xl bg-foreground text-background font-semibold text-xs hover:bg-foreground/90"
                    >
                      Get Code
                    </Button>

                    {/* Code dialog */}
                    <EmbedCodeDialog
                      open={codeDialogOpen}
                      onOpenChange={setCodeDialogOpen}
                      embedType={embedType}
                      options={options}
                      formId={formId}
                      docTitle={doc.title || undefined}
                    />
                  </div>
                );
              }}
            </form.Subscribe>
          )}
        </div>
      </SidebarContent>

      {/* Sticky footer — URL bar only, when published */}
      {!isDraft && (
        <SidebarFooter className="border-t">
          <div className="flex items-center bg-muted rounded-lg px-3 h-8 gap-2">
            <span className="text-[11px] text-muted-foreground truncate flex-1">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-1 text-xs font-medium text-foreground shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
