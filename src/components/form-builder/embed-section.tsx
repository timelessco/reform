import { useForm } from "@tanstack/react-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Code, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";
import { EmbedCodeDialog, generateEmbedUrl } from "./embed-code-dialog";
import { EmbedConfigPanel, defaultEmbedOptions } from "./embed-config-panel";
import type { EmbedOptions } from "./embed-config-panel";
import { EmbedPreviewMockup } from "./embed-preview-mockup";

export type EmbedFormValues = EmbedOptions & { embedType: EmbedType };

interface EmbedSectionProps {
  formId: string;
  docTitle?: string;
}

const tabs: { value: EmbedType; label: string }[] = [
  { value: "standard", label: "Embed" },
  { value: "popup", label: "Popup" },
  { value: "fullpage", label: "Full Page" },
];

/** Map URL search params → form field values */
function searchToFormValues(search: Record<string, unknown>): EmbedFormValues {
  return {
    embedType: (search.embedType as EmbedType) ?? "standard",
    height: (search.embedHeight as number) ?? defaultEmbedOptions.height,
    dynamicHeight: (search.embedDynamicHeight as boolean) ?? defaultEmbedOptions.dynamicHeight,
    hideTitle: (search.embedHideTitle as boolean) ?? defaultEmbedOptions.hideTitle,
    alignLeft: (search.embedAlignLeft as boolean) ?? defaultEmbedOptions.alignLeft,
    transparentBackground: (search.embedTransparent as boolean) ?? defaultEmbedOptions.transparentBackground,
    branding: (search.embedBranding as boolean) ?? defaultEmbedOptions.branding,
    trackEvents: (search.embedTrackEvents as boolean) ?? defaultEmbedOptions.trackEvents,
    customDomain: defaultEmbedOptions.customDomain,
    popupTrigger: (search.embedPopupTrigger as EmbedOptions["popupTrigger"]) ?? defaultEmbedOptions.popupTrigger,
    popupPosition: (search.embedPopupPosition as EmbedOptions["popupPosition"]) ?? defaultEmbedOptions.popupPosition,
    popupWidth: (search.embedPopupWidth as number) ?? defaultEmbedOptions.popupWidth,
    darkOverlay: (search.embedDarkOverlay as boolean) ?? defaultEmbedOptions.darkOverlay,
    emoji: (search.embedEmoji as boolean) ?? defaultEmbedOptions.emoji,
    emojiIcon: (search.embedEmojiIcon as string) ?? defaultEmbedOptions.emojiIcon,
    emojiAnimation: (search.embedEmojiAnimation as EmbedOptions["emojiAnimation"]) ?? defaultEmbedOptions.emojiAnimation,
    hideOnSubmit: (search.embedHideOnSubmit as boolean) ?? defaultEmbedOptions.hideOnSubmit,
    hideOnSubmitDelay: (search.embedHideOnSubmitDelay as number) ?? defaultEmbedOptions.hideOnSubmitDelay,
  };
}

/** Map form field values → URL search params */
function formValuesToSearch(v: EmbedFormValues) {
  return {
    embedType: v.embedType,
    embedHeight: v.height,
    embedDynamicHeight: v.dynamicHeight,
    embedHideTitle: v.hideTitle,
    embedAlignLeft: v.alignLeft,
    embedTransparent: v.transparentBackground,
    embedBranding: v.branding,
    embedTrackEvents: v.trackEvents,
    embedPopupTrigger: v.popupTrigger,
    embedPopupPosition: v.popupPosition,
    embedPopupWidth: v.popupWidth,
    embedDarkOverlay: v.darkOverlay,
    embedEmoji: v.emoji,
    embedEmojiIcon: v.emojiIcon,
    embedEmojiAnimation: v.emojiAnimation,
    embedHideOnSubmit: v.hideOnSubmit,
    embedHideOnSubmitDelay: v.hideOnSubmitDelay,
  };
}

export function EmbedSection({ formId, docTitle }: EmbedSectionProps) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const form = useForm({
    defaultValues: searchToFormValues(search),
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

  return (
    <div className="space-y-4 pt-4 border-t">
      {/* Section header */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
        Embed Form
      </h3>

      {/* Embed type tabs — managed by form.Field so onChange fires */}
      <form.Field name="embedType">
        {(field) => (
          <div className="flex items-center bg-muted/30 rounded-lg p-1 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => field.handleChange(tab.value)}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
                  field.state.value === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </form.Field>

      {/* Everything below reads reactive values via form.Subscribe */}
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

          const handleCopyLink = () => {
            const url = generateEmbedUrl(formId, options);
            navigator.clipboard.writeText(url);
            setCopiedLink(true);
            toast.success("Embed link copied to clipboard");
            setTimeout(() => setCopiedLink(false), 2000);
          };

          return (
            <>
              {/* Preview mockup */}
              <EmbedPreviewMockup
                embedType={embedType}
                popupPosition={options.popupPosition}
              />

              {/* Settings — uses form.Field internally */}
              <EmbedConfigPanel form={form} embedType={embedType} />

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => setCodeDialogOpen(true)}
                  className="w-full h-9 gap-2 rounded-lg font-semibold text-xs"
                >
                  <Code className="h-3.5 w-3.5" />
                  Get the code
                </Button>

                {embedType !== "popup" && (
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="w-full h-9 gap-2 text-muted-foreground font-medium text-xs hover:bg-muted hover:text-foreground border-muted-foreground/10 rounded-lg"
                  >
                    {copiedLink ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedLink ? "Copied!" : "Copy embed link"}
                  </Button>
                )}
              </div>

              {/* Code dialog */}
              <EmbedCodeDialog
                open={codeDialogOpen}
                onOpenChange={setCodeDialogOpen}
                embedType={embedType}
                options={options}
                formId={formId}
                docTitle={docTitle}
              />
            </>
          );
        }}
      </form.Subscribe>
    </div>
  );
}
