import type { EmbedType } from "@/hooks/use-editor-sidebar";
import type { EmbedOptions } from "./embed-config-panel";
import { defaultEmbedOptions } from "./embed-config-panel";

export { EmbedCodeDialog, generateEmbedUrl } from "./embed-code-dialog";

export type EmbedFormValues = EmbedOptions & { embedType: EmbedType };

export const tabs: { value: EmbedType; label: string }[] = [
  { value: "standard", label: "Embed" },
  { value: "popup", label: "Popup" },
  { value: "fullpage", label: "Full Page" },
];

/** Map URL search params → form field values */
export function searchToFormValues(
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
export function formValuesToSearch(v: EmbedFormValues) {
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
