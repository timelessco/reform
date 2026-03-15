import { useForm as useTanstackForm } from "@tanstack/react-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { RocketIcon, XIcon } from "@/components/ui/icons";
import { useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button/copy-button";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { SidebarSection } from "@/components/ui/sidebar-section";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "@/hooks/use-live-hooks";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { publishForm } from "@/hooks/use-form-versions";
import { formFieldsToEmbedOptions } from "./embed-config-panel";
import { EmbedConfigPanel } from "./embed-config-panel";
import { EmbedCodeDialog, searchToFormValues, formValuesToSearch, tabs } from "./embed-section";
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

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header */}
      <SidebarHeader className="pt-2 pb-3 pl-1 shrink-0 gap-2.25 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base text-foreground pl-2.5">Share</h2>
          <Button
            variant="ghost"
            size="icon-xs"
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
              <Tabs
                value={field.state.value}
                defaultValue={"fullpage"}
                onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
                className="pl-1"
              >
                <TabsList className="w-full">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={"tracking-[0.21px] text-base font-medium"}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                  <TabsIndicator />
                </TabsList>
              </Tabs>
            )}
          </form.Field>
        )}
      </SidebarHeader>

      {/* Scrollable content */}
      <SidebarContent>
        <div className="px-3">
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
                      className="w-full h-9 mt-0.5 rounded-2xl font-semibold text-xs hover:bg-foreground/90"
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
        <SidebarFooter className="px-2 py-2">
          <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 pl-[10px] pr-[3px] py-[3px] h-[30px]">
            <span className="flex-1 min-w-0 truncate text-sm text-(--color-gray-alpha-600) font-normal font-case">
              {shareUrl}
            </span>
            <CopyButton
              text={shareUrl}
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 rounded-[5px] bg-(--color-gray-0) shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1),0px_0px_0.5px_0px_rgba(0,0,0,0.6)] px-2 gap-1 text-sm  text-gray-600 border-none hover:bg-(--color-gray-0) [&_svg]:size-[13px]"
            >
              Copy
            </CopyButton>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
