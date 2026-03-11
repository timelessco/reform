import { useForm as useTanstackForm } from "@tanstack/react-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { RocketIcon, XIcon } from "@/components/ui/icons";
import { useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button/copy-button";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { SidebarSection } from "@/components/ui/sidebar-section";
import { useForm } from "@/hooks/use-live-hooks";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { publishForm } from "@/hooks/use-form-versions";
import { cn } from "@/lib/utils";
import { formFieldsToEmbedOptions } from "./embed-config-panel";
import { EmbedConfigPanel } from "./embed-config-panel";
import { EmbedCodeDialog, searchToFormValues, formValuesToSearch, tabs } from "./embed-section";
import { EmbedPreviewMockup } from "./embed-preview-mockup";

function EmbedTabBar({
  tabs: items,
  value,
  onChange,
}: {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const activeIndex = items.findIndex((t) => t.value === value);
  const count = items.length;
  const padding = 3; // px – matches p-[3px] on the container
  const totalPadding = padding * 2;
  // Pill width = (container - 2×padding) / N
  const pillWidth = `calc((100% - ${totalPadding}px) / ${count})`;
  // Pill left = padding + index × pillWidth
  const pillLeft = `calc(${padding}px + ${activeIndex} * (100% - ${totalPadding}px) / ${count})`;

  return (
    <div className="relative bg-secondary rounded-[10px] p-[3px] w-full flex">
      <div
        className="absolute top-[3px] bottom-[3px] rounded-[8px] bg-white shadow-[0px_0px_1.5px_0px_rgba(0,0,0,0.16),0px_2px_5px_0px_rgba(0,0,0,0.14)] dark:bg-background z-0 transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ left: pillLeft, width: pillWidth }}
      />
      {items.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative z-10 flex-1 h-7 rounded-[8px] text-sm font-medium text-center flex items-center justify-center transition-colors",
            value === tab.value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

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

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header */}
      <SidebarHeader className="pt-2 pb-1 pl-1 shrink-0  space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground px-2.5">Share</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab bar — only when published */}
        {!isDraft && (
          <form.Field name="embedType">
            {(field) => (
              <EmbedTabBar
                tabs={tabs}
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
              />
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
                <RocketIcon className="h-8 w-8 animate-bounce-subtle" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Ready to go live?</h3>
                <p className="text-xs text-muted-foreground">
                  Your form is currently in draft. Publish it to start collecting responses.
                </p>
              </div>
              <Button size="sm" onClick={handlePublish} className="w-full font-semibold gap-2">
                Publish Now
              </Button>
            </div>
          ) : (
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const embedType = values.embedType;
                const options = formFieldsToEmbedOptions(values);
                console.log(options, "options");
                return (
                  <div className="space-y-3">
                    {/* Preview mockup */}
                    <EmbedPreviewMockup
                      embedType={embedType}
                      popupPosition={options.popup.position}
                      darkOverlay={options.popup.overlay === "dark"}
                      emoji={options.popup.emoji}
                      emojiIcon={options.popup.emojiIcon}
                      alignLeft={options.display.alignment === "left"}
                    />

                    {/* Customise section */}
                    <SidebarSection label="Customise" className="pb-2.75" action={<></>}>
                      <EmbedConfigPanel form={form} embedType={embedType} section="customize" />
                    </SidebarSection>

                    {/* Pro Features section */}
                    <SidebarSection label="Pro Features" action={<></>}>
                      <EmbedConfigPanel form={form} embedType={embedType} section="pro" />
                    </SidebarSection>

                    {/* Get Code button — inside scrollable content, after Pro Features */}
                    <Button
                      onClick={() => setCodeDialogOpen(true)}
                      variant="default"
                      className="w-full h-9 rounded-xl font-semibold text-xs hover:bg-foreground/90"
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
        <SidebarFooter className="px-2 py-2.25">
          <ButtonGroup className="w-full">
            <ButtonGroupText className="flex-1 min-w-0 h-8 rounded-lg">
              <span className="text-[11px] text-muted-foreground truncate">{shareUrl}</span>
            </ButtonGroupText>
            <CopyButton
              text={shareUrl}
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-lg"
              onCopySuccess={() => toast.success("Link copied to clipboard")}
            >
              Copy
            </CopyButton>
          </ButtonGroup>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
