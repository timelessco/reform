import { useForm as useTanstackForm } from "@tanstack/react-form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Code, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useForm } from "@/hooks/use-live-hooks";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";
import { EmbedCodeDialog, generateEmbedUrl } from "./embed-code-dialog";
import { EmbedConfigPanel, defaultEmbedOptions } from "./embed-config-panel";
import type { EmbedOptions } from "./embed-config-panel";
import { EmbedPreviewMockup } from "./embed-preview-mockup";

type EmbedFormValues = EmbedOptions & { embedType: EmbedType };

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
function searchToFormValues(
  search: Record<string, unknown>,
  formIcon?: string | null,
): EmbedFormValues {
  return {
    embedType:
      (search.embedType as EmbedType) ?? ((search.demo as boolean) ? "standard" : "fullpage"),
    height: (search.embedHeight as number) ?? defaultEmbedOptions.height,
    dynamicHeight: (search.embedDynamicHeight as boolean) ?? defaultEmbedOptions.dynamicHeight,
    hideTitle: (search.embedHideTitle as boolean) ?? defaultEmbedOptions.hideTitle,
    alignLeft: (search.embedAlignLeft as boolean) ?? defaultEmbedOptions.alignLeft,
    transparentBackground:
      (search.embedTransparent as boolean) ?? defaultEmbedOptions.transparentBackground,
    branding: (search.embedBranding as boolean) ?? defaultEmbedOptions.branding,
    trackEvents: (search.embedTrackEvents as boolean) ?? defaultEmbedOptions.trackEvents,
    customDomain: defaultEmbedOptions.customDomain,
    popupTrigger:
      (search.embedPopupTrigger as EmbedOptions["popupTrigger"]) ??
      defaultEmbedOptions.popupTrigger,
    popupPosition:
      (search.embedPopupPosition as EmbedOptions["popupPosition"]) ??
      defaultEmbedOptions.popupPosition,
    popupWidth: (search.embedPopupWidth as number) ?? defaultEmbedOptions.popupWidth,
    darkOverlay: (search.embedDarkOverlay as boolean) ?? defaultEmbedOptions.darkOverlay,
    emoji: (search.embedEmoji as boolean) ?? defaultEmbedOptions.emoji,
    emojiIcon: (search.embedEmojiIcon as string) ?? (formIcon || defaultEmbedOptions.emojiIcon),
    emojiAnimation:
      (search.embedEmojiAnimation as EmbedOptions["emojiAnimation"]) ??
      defaultEmbedOptions.emojiAnimation,
    hideOnSubmit: (search.embedHideOnSubmit as boolean) ?? defaultEmbedOptions.hideOnSubmit,
    hideOnSubmitDelay:
      (search.embedHideOnSubmitDelay as number) ?? defaultEmbedOptions.hideOnSubmitDelay,
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

  // Fetch actual form data to show in preview
  const { data: formDocs } = useForm(formId);
  const doc = formDocs?.[0];

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

  return (
    <div className="space-y-4">
      {/* Embed type tabs — managed by form.Field so onChange fires */}
      <form.Field name="embedType">
        {(field) => (
          <div className="flex items-center bg-light-gray-100 dark:bg-muted rounded-[10px] p-[3px] gap-1">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant="tab"
                onClick={() => field.handleChange(tab.value)}
                data-active={field.state.value === tab.value}
                className={cn(
                  "flex-1 text-[13px] font-medium py-1.5 px-2 h-auto rounded-[8px]",
                  field.state.value === tab.value
                    ? "bg-background text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-background"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-transparent",
                )}
              >
                {tab.label}
              </Button>
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
              {/* Preview mockup - now ultra-minimal box design */}
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
                  className="w-full h-10 gap-2 rounded-xl font-bold text-xs shadow-sm bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Code className="h-3.5 w-3.5" />
                  Get the code
                </Button>

                {embedType !== "popup" && (
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="w-full h-10 gap-2 text-muted-foreground font-bold text-xs hover:bg-muted hover:text-foreground border-muted-foreground/10 rounded-xl"
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
