import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, Code, Copy, Eye, HelpCircle, Sparkles, X } from "lucide-react";
import type { Value } from "platejs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "@/hooks/use-live-hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/embed",
)({
  component: EmbedPage,
  validateSearch: z.object({
    type: z.enum(["standard", "popup", "fullpage"]).optional(),
    showCode: z.boolean().catch(false).optional(),
    transparentBackground: z.boolean().catch(false).optional(),
  }),
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

type EmbedType = "standard" | "popup" | "fullpage";

interface EmbedOptions {
  height: number;
  dynamicHeight: boolean;
  hideTitle: boolean;
  alignLeft: boolean;
  transparentBackground: boolean;
  trackEvents: boolean;
  customDomain: boolean;
  branding: boolean;
  // Popup specific
  popupTrigger: "button" | "auto" | "scroll";
  popupPosition: "bottom-right" | "bottom-left" | "center";
  popupWidth: number;
  darkOverlay: boolean;
  emoji: boolean;
  emojiIcon: string;
  emojiAnimation: "wave" | "bounce" | "pulse";
  hideOnSubmit: boolean;
  hideOnSubmitDelay: number;
}

function EmbedPage() {
  const { formId, workspaceId } = Route.useParams();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { data: savedDocs } = useForm(formId);
  const doc = savedDocs?.[0];

  // Derive embedType directly from URL params (no useState needed)
  const embedType = search.type ?? "standard";
  const showCode = search.showCode ?? false;

  const [options, setOptions] = useState<EmbedOptions>({
    height: 558,
    dynamicHeight: true,
    hideTitle: false,
    alignLeft: false,
    transparentBackground: search.transparentBackground ?? false,
    trackEvents: false,
    customDomain: false,
    branding: true,
    // Popup defaults
    popupTrigger: "button",
    popupPosition: "bottom-right",
    popupWidth: 376,
    darkOverlay: false,
    emoji: true,
    emojiIcon: "👋",
    emojiAnimation: "wave",
    hideOnSubmit: false,
    hideOnSubmitDelay: 0,
  });
  const [copiedLink, setCopiedLink] = useState(false);

  const embedUrl = useMemo(() => {
    const baseUrl = `${window.location.origin}/forms/${formId}`;
    const params = new URLSearchParams();
    if (options.hideTitle) params.append("hideTitle", "true");
    if (options.transparentBackground) params.append("transparent", "true");
    if (options.alignLeft) params.append("align", "left");
    if (!options.branding) params.append("branding", "false");
    if (options.dynamicHeight) params.append("dynamicHeight", "true");
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [formId, options]);

  const embedCode = useMemo(() => {
    if (embedType === "standard") {
      const baseUrl = `${window.location.origin}/widgets/embed.js`;
      // PostMessage listener for dynamic height - updates iframe when form sends resize events
      const dynamicHeightScript = options.dynamicHeight
        ? `window.addEventListener("message",function(e){try{var d=JSON.parse(e.data);if(d.event==="BetterForms.Resize"){var f=document.querySelector('iframe[data-better-forms-src]');if(f&&typeof d.height==="number")f.style.height=d.height+"px"}}catch{}});`
        : "";
      return `<iframe
  data-better-forms-src="${embedUrl}"
  loading="lazy"
  width="100%"
  height="${options.height}"
  frameborder="0"
  marginheight="0"
  marginwidth="0"
  title="${doc?.title || "Form"}"
></iframe>
<script>${dynamicHeightScript}var d=document,w="${baseUrl}",v=function(){"undefined"!=typeof BetterForms?BetterForms.loadEmbeds():d.querySelectorAll("iframe[data-better-forms-src]:not([src])").forEach((function(e){e.src=e.dataset.betterFormsSrc}))};if("undefined"!=typeof BetterForms)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w,s.onload=v,s.onerror=v,d.body.appendChild(s);}</script>`;
    }

    if (embedType === "popup") {
      return `${"<!-- Better Forms Popup Embed -->"}
<script>
  (function() {
    var script = document.createElement('script');
    script.src = "${window.location.origin}/embed/popup.js";
    script.setAttribute('data-form-id', '${formId}');
    script.setAttribute('data-position', '${options.popupPosition}');
    script.setAttribute('data-width', '${options.popupWidth}');
    script.setAttribute('data-trigger', '${options.popupTrigger}');
    ${options.darkOverlay ? "script.setAttribute('data-dark-overlay', 'true');" : ""}
    ${options.emoji ? `script.setAttribute('data-emoji', '${options.emojiIcon}');` : ""}
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
    }

    // Full page
    return `${"<!-- Redirect to full page form -->"}
<meta http-equiv="refresh" content="0; url=${embedUrl}" />

${"<!-- Or link to it -->"}
<a href="${embedUrl}">Open Form</a>`;
  }, [embedType, embedUrl, options, formId, doc?.title]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(embedUrl);
    setCopiedLink(true);
    toast.success("Embed link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const updateOption = <K extends keyof EmbedOptions>(key: K, value: EmbedOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));

    if (key === "transparentBackground") {
      navigate({
        search: (prev) => ({
          ...prev,
          transparentBackground: value as boolean,
        }),
      });
    }
  };

  const toggleCodeView = () => {
    if (embedType === "fullpage") {
      handleCopyLink();
      return;
    }
    navigate({
      search: (prev) => ({ ...prev, showCode: !showCode }),
    });
  };

  if (!doc) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      {/* Left Sidebar - Options */}
      <div className="w-full lg:w-[360px] border-b lg:border-r bg-background flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Embed</h1>
          <Link
            to="/workspace/$workspaceId/form-builder/$formId/share"
            params={{ workspaceId, formId }}
          >
            <div className="p-1 px-3 rounded-md hover:bg-muted transition-colors cursor-pointer">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Close
              </span>
            </div>
          </Link>
        </div>

        <div className="flex-1 px-6 py-2 space-y-8 lg:overflow-y-auto scrollbar-hide">
          {/* Embed Type & Primary Action */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Embed type
              </Label>
              <Select
                value={embedType}
                onValueChange={(v) => {
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      type: v as EmbedType,
                      showCode: false,
                    }),
                  });
                }}
              >
                <SelectTrigger className="w-full h-10 bg-background border-muted-foreground/20 rounded-lg shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard" className="py-2.5">
                    Standard
                  </SelectItem>
                  <SelectItem value="popup" className="py-2.5">
                    Popup
                  </SelectItem>
                  <SelectItem value="fullpage" className="py-2.5">
                    Full page
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={toggleCodeView}
              className={cn(
                "w-full h-11 gap-2 rounded-xl font-bold transition-all active:scale-[0.98]",
                showCode
                  ? "bg-white border border-gray-200 text-foreground hover:bg-gray-50 shadow-sm"
                  : "bg-black hover:bg-black/90 text-white shadow-md shadow-black/10",
              )}
            >
              {embedType === "fullpage" ? (
                <>
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? "Copied!" : "Copy embed link"}
                </>
              ) : showCode ? (
                <>
                  <Eye className="h-4 w-4" />
                  Back to preview
                </>
              ) : (
                <>
                  <Code className="h-4 w-4" />
                  Get the code
                </>
              )}
            </Button>
          </div>

          {/* Options Section - Only show when not showing code */}
          {!showCode && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between pt-2">
                <h2 className="text-sm font-bold text-foreground">Configuration</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors group">
                        <HelpCircle className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        <span>Help</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-white border-none px-3 py-1.5">
                      <p className="text-xs">Customize your form's layout and behavior</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Standard Embed Options */}
              {embedType === "standard" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Appearance
                    </Label>

                    {/* Height */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-[13px] font-medium">Height</Label>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">
                          Pixels
                        </span>
                      </div>
                      <div className="relative group">
                        <Input
                          type="number"
                          value={options.height}
                          onChange={(e) => updateOption("height", Number(e.target.value))}
                          className="h-10 bg-muted/30 border-muted-foreground/20 rounded-lg focus-visible:ring-black group-hover:border-muted-foreground/40 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-4 pt-2">
                      {/* Dynamic Height */}
                      <div className="flex items-center justify-between group">
                        <div className="space-y-0.5">
                          <Label className="text-[13px] font-medium cursor-pointer">
                            Dynamic height
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Adjust iframe height to content
                          </p>
                        </div>
                        <Switch
                          checked={options.dynamicHeight}
                          onCheckedChange={(v) => updateOption("dynamicHeight", v)}
                        />
                      </div>

                      {/* Hide Form Title */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-[13px] font-medium cursor-pointer">
                            Hide form title
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Removes the title from preview
                          </p>
                        </div>
                        <Switch
                          checked={options.hideTitle}
                          onCheckedChange={(v) => updateOption("hideTitle", v)}
                        />
                      </div>

                      {/* Align Content Left */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-[13px] font-medium cursor-pointer">
                            Align left
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Left align the form elements
                          </p>
                        </div>
                        <Switch
                          checked={options.alignLeft}
                          onCheckedChange={(v) => updateOption("alignLeft", v)}
                        />
                      </div>

                      {/* Transparent Background */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-[13px] font-medium cursor-pointer">
                            Transparency
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Makes form background invisible
                          </p>
                        </div>
                        <Switch
                          checked={options.transparentBackground}
                          onCheckedChange={(v) => updateOption("transparentBackground", v)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Popup Embed Options */}
              {embedType === "popup" && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Trigger & Position
                    </Label>

                    {/* Open Trigger */}
                    <div className="space-y-2.5">
                      <Label className="text-[13px] font-medium">Open when</Label>
                      <Select
                        value={options.popupTrigger}
                        onValueChange={(v) =>
                          updateOption("popupTrigger", v as typeof options.popupTrigger)
                        }
                      >
                        <SelectTrigger className="w-full h-10 bg-muted/30 border-muted-foreground/20 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="button">On button click</SelectItem>
                          <SelectItem value="auto">Automatically</SelectItem>
                          <SelectItem value="scroll">After scrolling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Position */}
                    <div className="space-y-2.5">
                      <Label className="text-[13px] font-medium">Position on screen</Label>
                      <Select
                        value={options.popupPosition}
                        onValueChange={(v) =>
                          updateOption("popupPosition", v as typeof options.popupPosition)
                        }
                      >
                        <SelectTrigger className="w-full h-10 bg-muted/30 border-muted-foreground/20 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="center">Center Modal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Width */}
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-[13px] font-medium">Popup width</Label>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">
                          Pixels
                        </span>
                      </div>
                      <Input
                        type="number"
                        value={options.popupWidth}
                        onChange={(e) => updateOption("popupWidth", Number(e.target.value))}
                        className="h-10 bg-muted/30 border-muted-foreground/20 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Visuals
                    </Label>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] font-medium cursor-pointer">
                          Dark overlay
                        </Label>
                        <Switch
                          checked={options.darkOverlay}
                          onCheckedChange={(v) => updateOption("darkOverlay", v)}
                        />
                      </div>

                      {/* Emoji Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] font-medium cursor-pointer">
                            Show Emoji icon
                          </Label>
                          <Switch
                            checked={options.emoji}
                            onCheckedChange={(v) => updateOption("emoji", v)}
                          />
                        </div>

                        {options.emoji && (
                          <div className="space-y-3 pl-4 py-3 border-l-2 border-muted bg-muted/20 rounded-r-lg">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-muted-foreground font-bold uppercase">
                                Character
                              </Label>
                              <Input
                                value={options.emojiIcon}
                                onChange={(e) => updateOption("emojiIcon", e.target.value)}
                                className="h-9 bg-white border-muted-foreground/20 text-lg text-center"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-muted-foreground font-bold uppercase">
                                Animation
                              </Label>
                              <Select
                                value={options.emojiAnimation}
                                onValueChange={(v) =>
                                  updateOption("emojiAnimation", v as typeof options.emojiAnimation)
                                }
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="wave">Wave</SelectItem>
                                  <SelectItem value="bounce">Bounce</SelectItem>
                                  <SelectItem value="pulse">Pulse</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Behavior
                    </Label>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label className="text-[13px] font-medium cursor-pointer">
                            Hide on submit
                          </Label>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            Close after success
                          </p>
                        </div>
                        <Switch
                          checked={options.hideOnSubmit}
                          onCheckedChange={(v) => updateOption("hideOnSubmit", v)}
                        />
                      </div>

                      {options.hideOnSubmit && (
                        <div className="space-y-2.5 pl-4 py-3 border-l-2 border-muted bg-muted/20 rounded-r-lg">
                          <Label className="text-[11px] text-muted-foreground font-bold uppercase">
                            Delay (seconds)
                          </Label>
                          <Input
                            type="number"
                            value={options.hideOnSubmitDelay}
                            step={0.1}
                            onChange={(e) =>
                              updateOption("hideOnSubmitDelay", Number(e.target.value))
                            }
                            className="h-9 bg-white border-muted-foreground/20"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Page Options */}
              {embedType === "fullpage" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Appearance
                    </Label>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-[13px] font-medium cursor-pointer">
                          Transparent background
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Remove page background color
                        </p>
                      </div>
                      <Switch
                        checked={options.transparentBackground}
                        onCheckedChange={(v) => updateOption("transparentBackground", v)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pro Features Group */}
              <div className="space-y-4 pt-6 mt-4 border-t border-muted/60">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Pro Settings
                </Label>

                <div className="space-y-5">
                  {/* Track Form Events */}
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <Label className="text-[13px] font-medium flex items-center gap-2 cursor-pointer">
                        Analytics tracking
                        <HelpCircle className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Record views and submissions
                      </p>
                    </div>
                    <Switch
                      checked={options.trackEvents}
                      onCheckedChange={(v) => updateOption("trackEvents", v)}
                    />
                  </div>

                  {/* Custom Domain - Pro */}
                  <div className="flex items-center justify-between group opacity-70 cursor-not-allowed">
                    <div className="space-y-0.5">
                      <Label className="text-[13px] font-medium flex items-center gap-2">
                        Custom domain
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-3.5 px-1.5 font-bold bg-purple-50 text-purple-600 border-purple-100 uppercase"
                        >
                          Pro
                        </Badge>
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Use your own domain</p>
                    </div>
                    <Switch
                      checked={options.customDomain}
                      onCheckedChange={(v) => updateOption("customDomain", v)}
                      disabled
                    />
                  </div>

                  {/* Branding - Pro */}
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <Label className="text-[13px] font-medium flex items-center gap-2 cursor-pointer">
                        Better Forms branding
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-3.5 px-1.5 font-bold bg-[#FFF1F2] text-[#E11D48] border-[#FFE4E6] uppercase"
                        >
                          Pro
                        </Badge>
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Show "Made with Better Forms"
                      </p>
                    </div>
                    <Switch
                      checked={options.branding}
                      onCheckedChange={(v) => updateOption("branding", v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer - Always show Copy link if not fullpage. Fullpage handles this in the main button */}
        {embedType !== "fullpage" && !showCode && (
          <div className="p-6 pt-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="w-full h-10 gap-2 text-muted-foreground font-semibold hover:bg-muted hover:text-foreground border-muted-foreground/10 rounded-lg transition-all"
            >
              {copiedLink ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedLink ? "Copied Link!" : "Copy embed link"}
            </Button>
          </div>
        )}
      </div>

      {/* Right Side - Preview or Instructions */}
      <div
        className={cn(
          "flex-1 overflow-y-auto transition-colors duration-500 min-h-[500px] lg:min-h-0",
          showCode ? "bg-[#1E2025]" : "bg-[#F9FAFB]",
        )}
      >
        {showCode ? (
          <EmbedInstructions
            embedType={embedType}
            options={options}
            embedCode={embedCode}
            embedUrl={embedUrl}
            formId={formId}
            docTitle={doc?.title}
          />
        ) : (
          <div className="relative min-h-full">
            {/* Standard & Popup - Show mock website background */}
            {embedType !== "fullpage" && (
              <div className="flex flex-col min-h-full">
                {/* Mock Website Container */}
                <div className="flex-1 bg-white relative p-4 lg:p-0">
                  {/* Mock Website Elements (Based on Ref Image 1) */}
                  <div className="max-w-[1000px] mx-auto pt-4 px-4 lg:px-8 space-y-8">
                    {/* Preview Label */}
                    <div className="flex items-center pt-2">
                      <span className="text-gray-300 font-bold text-[10px] uppercase tracking-widest">
                        Live Preview
                      </span>
                    </div>

                    {/* Mock Header Bars - Simplified on Mobile */}
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

                    {/* Simple Mock Content Area (Matching Ref 1 Layout) */}
                    <div className="grid grid-cols-12 gap-4 lg:gap-8 pt-4">
                      {/* Mock Sidebar - Hidden on Mobile */}
                      <div className="hidden lg:block col-span-3 space-y-6">
                        <div className="w-full h-7 bg-gray-50/60 rounded-sm" />
                        <div className="space-y-3">
                          <div className="w-full h-2.5 bg-gray-50/80 rounded-full" />
                          <div className="w-4/5 h-2.5 bg-gray-50/80 rounded-full" />
                          <div className="w-2/3 h-2.5 bg-gray-50/80 rounded-full" />
                        </div>
                        <div className="w-full h-32 bg-gray-50/30 border border-dashed border-gray-100 rounded-xl" />
                      </div>

                      {/* Main Content Area */}
                      <div className="col-span-12 lg:col-span-9 space-y-10">
                        <div className="space-y-4">
                          <div className="w-3/4 lg:w-1/2 h-8 bg-gray-50/70 rounded-lg" />
                          <div className="space-y-2">
                            <div className="w-full h-2.5 bg-gray-50/80 rounded-full" />
                            <div className="w-full h-2.5 bg-gray-50/80 rounded-full" />
                            <div className="w-3/4 h-2.5 bg-gray-50/80 rounded-full" />
                          </div>
                        </div>

                        {/* The Form Itself - Seamlessly integrated per Ref 1 */}
                        <div
                          className={cn(
                            "w-full transition-all duration-500 rounded-2xl",
                            options.transparentBackground
                              ? "bg-transparent"
                              : "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100 p-8",
                          )}
                          style={{
                            height: options.dynamicHeight ? "auto" : options.height,
                          }}
                        >
                          <FormPreviewFromPlate
                            content={doc.content as Value}
                            title={options.hideTitle ? "" : doc.title}
                            icon={doc.icon ?? undefined}
                            cover={doc.cover ?? undefined}
                            onSubmit={async () => {}}
                            hideTitle={options.hideTitle}
                          />
                        </div>

                        {/* Branding after standard form - Right Aligned per design */}
                        {options.branding && (
                          <div className="flex justify-end pt-8">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF5FF] rounded-full text-[11px] font-bold text-[#0066CC] hover:scale-105 transition-transform cursor-default shadow-sm border border-blue-50">
                              <span>Made with</span>
                              <Sparkles className="h-3.5 w-3.5 fill-[#0066CC] text-[#0066CC]" />
                              <span>Better Forms</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Popup Specific - Full Area Dark Overlay and Popup */}
                  {embedType === "popup" && (
                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                      {/* Full Area Dark Overlay */}
                      {options.darkOverlay && (
                        <div className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-300 pointer-events-auto" />
                      )}

                      {/* Floating Popup Form Mock */}
                      <div
                        className={cn(
                          "absolute bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 z-20 pointer-events-auto",
                          options.popupPosition === "center"
                            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                            : options.popupPosition === "bottom-left"
                              ? "bottom-12 left-12"
                              : "bottom-12 right-12",
                        )}
                        style={{ width: options.popupWidth }}
                      >
                        {/* Close Button Only - Header handled by FormPreviewFromPlate */}
                        <div className="absolute top-4 right-4 z-30 pointer-events-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-black/10 text-gray-400 bg-white/50 backdrop-blur-sm rounded-full shadow-sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Popup Content - Using FormPreviewFromPlate with full header data */}
                        <div className="overflow-y-auto max-h-[650px]">
                          <FormPreviewFromPlate
                            content={doc.content as Value}
                            title={options.hideTitle ? "" : doc.title}
                            icon={doc.icon ?? undefined}
                            cover={doc.cover ?? undefined}
                            onSubmit={async () => {}}
                            hideTitle={options.hideTitle}
                          />
                        </div>

                        {/* Popup Branding Support */}
                        {options.branding && (
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

            {/* Full Page - Clean direct form display */}
            {embedType === "fullpage" && (
              <div
                className={cn(
                  "min-h-full flex flex-col transition-colors duration-300",
                  options.transparentBackground ? "bg-transparent" : "bg-white",
                )}
              >
                <div className="flex-1 w-full max-w-3xl mx-auto py-12 px-8">
                  <FormPreviewFromPlate
                    content={doc.content as Value}
                    title={options.hideTitle ? "" : doc.title}
                    icon={doc.icon ?? undefined}
                    cover={doc.cover ?? undefined}
                    onSubmit={async () => {}}
                    hideTitle={options.hideTitle}
                  />

                  {/* Integrated Branding for Full Page - Right Aligned per Ref 3 */}
                  {options.branding && (
                    <div className="mt-20 flex justify-end pb-12">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF5FF] rounded-full text-[11px] font-bold text-[#0066CC] hover:scale-105 transition-transform cursor-default shadow-sm border border-blue-50">
                        <span>Made with</span>
                        <Sparkles className="h-3.5 w-3.5 fill-[#0066CC] text-[#0066CC]" />
                        <span>Better Forms</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group mt-3">
      <pre className="bg-[#0D0F12] border border-white/5 rounded-xl p-6 overflow-x-auto text-[13px] font-mono text-gray-300 leading-relaxed scrollbar-hide shadow-2xl">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function EmbedInstructions({
  embedType,
  options,
  embedCode,
  embedUrl,
  formId,
  docTitle,
}: {
  embedType: EmbedType;
  options: EmbedOptions;
  embedCode: string;
  embedUrl: string;
  formId: string;
  docTitle?: string;
}) {
  const [sections, setSections] = useState<Record<string, boolean>>({
    save: false,
    js: false,
  });

  const toggleSection = (section: string) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const emojiParams = options.emoji
    ? `&emoji-text=${encodeURIComponent(options.emojiIcon)}&emoji-animation=${options.emojiAnimation}`
    : "";
  const hashUrl = `#form-open=${formId}&align-left=${options.alignLeft ? 1 : 0}&hide-title=${options.hideTitle ? 1 : 0}&overlay=${options.darkOverlay ? 1 : 0}${emojiParams}&auto-close=${options.hideOnSubmit ? options.hideOnSubmitDelay * 1000 : 0}`;

  return (
    <div className="p-4 lg:p-12 pb-32 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="space-y-2 mb-10">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          Add to your website
        </h1>
        <p className="text-gray-400 max-w-2xl leading-relaxed">
          {embedType === "popup"
            ? `Enable the Better Forms popup on your site with a single script and trigger via button attributes or direct JS.`
            : "Integrate this form seamlessly into your website's layout using the robust HTML snippet below."}
        </p>
      </div>

      <div className="space-y-8">
        {embedType === "standard" ? (
          <div className="space-y-8">
            <div>
              <h3 className="text-white font-semibold mb-3">Embed code</h3>
              <p className="text-gray-400 text-sm mb-4">
                Paste this HTML code snippet on the page where you want the embed to appear.
              </p>
              <CodeBlock code={embedCode} />
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Direct link</h3>
              <p className="text-gray-400 text-sm mb-4">
                Alternatively, simply paste this embed link in the editor of a no-code tool (Notion,
                Ghost, Canva, etc). To enable dynamic height, you will also need to include the
                script tag in the <code className="text-gray-300">&lt;head&gt;</code> section of
                your website.
              </p>
              <div className="bg-[#1A1D23] p-4 rounded-lg border border-gray-800 text-sm break-all font-mono text-blue-400 mb-4">
                {embedUrl}
              </div>
              <CodeBlock
                code={`<script async src="${window.location.origin}/widgets/embed.js"></script>`}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Popup Instructions */}
            <div>
              <CodeBlock
                code={`<script async src="${window.location.origin}/embed/popup.js"></script>`}
              />
            </div>

            <div>
              <p className="text-gray-300 mt-8 mb-4 leading-relaxed">
                Then to <strong className="text-white">open the popup on clicking a button</strong>,
                you need to add the following{" "}
                <span className="text-white font-mono bg-gray-800 px-1 py-0.5 rounded">
                  data-form-id
                </span>{" "}
                attributes to an existing button on your page. You can add these attributes to any
                clickable element - button, div, etc.
              </p>
              <div className="bg-[#2D3139] border-l-4 border-blue-500 rounded-r-lg p-4 mb-4">
                <p className="text-sm text-gray-300 font-mono">
                  <span className="text-gray-500">{"// Data attributes"}</span>
                  <br />
                  <span className="break-all text-blue-300">
                    data-form-id="{formId}" data-align-left="
                    {options.alignLeft ? 1 : 0}" data-hide-title="
                    {options.hideTitle ? 1 : 0}" data-overlay="
                    {options.darkOverlay ? 1 : 0}"{" "}
                    {options.emoji
                      ? `data-emoji-text="${options.emojiIcon}" data-emoji-animation="${options.emojiAnimation}"`
                      : ""}{" "}
                    data-auto-close="
                    {options.hideOnSubmit ? options.hideOnSubmitDelay * 1000 : 0}"
                  </span>
                </p>
              </div>
              <CodeBlock
                code={`// Example
<button type="button" 
  data-form-id="${formId}" 
  data-align-left="${options.alignLeft ? 1 : 0}" 
  data-hide-title="${options.hideTitle ? 1 : 0}" 
  data-overlay="${options.darkOverlay ? 1 : 0}"
  ${options.emoji ? `data-emoji-text="${options.emojiIcon}" data-emoji-animation="${options.emojiAnimation}"\n  ` : ""}data-auto-close="${options.hideOnSubmit ? options.hideOnSubmitDelay * 1000 : 0}"
>
  Click me
</button>`}
              />
            </div>

            <div>
              <p className="text-gray-300 mt-8 mb-4">
                Alternatively, you can{" "}
                <strong className="text-white">open the popup by clicking on a link</strong> with a
                custom URL hash. Add the URL below to a link on your page to open the popup.
              </p>
              <div className="bg-[#2D3139] border-l-4 border-blue-500 rounded-r-lg p-4 mb-4">
                <p className="text-sm text-gray-300 font-mono">
                  <span className="text-gray-500">{"// Link href attribute"}</span>
                  <br />
                  <span className="break-all text-blue-300">{hashUrl}</span>
                </p>
              </div>
              <CodeBlock
                code={`// Example
<a href="${hashUrl}">
  Click me
</a>`}
              />
            </div>
          </>
        )}

        {/* Documentation Accordions */}
        <div className="pt-8 border-t border-gray-800 space-y-2">
          {/* Query Parameters Accordion */}
          <div className="border-b border-gray-800">
            <button
              type="button"
              onClick={() => toggleSection("save")}
              className="w-full flex items-center justify-between py-6 text-left"
            >
              <span className="text-lg font-semibold text-white">
                Save website page and query parameters
              </span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-gray-500 transition-transform",
                  sections.save && "rotate-180",
                )}
              />
            </button>
            {sections.save && (
              <div className="pb-8 space-y-6 text-gray-400">
                <p className="leading-relaxed">
                  Your website's page and all query parameters will be automatically forwarded to
                  the {embedType === "popup" ? "Better Forms popup" : "form"} and could be saved
                  using hidden fields. For example, if your page's URL looks like the one below and
                  you have hidden fields for <code className="text-gray-300">originPage</code>,{" "}
                  <code className="text-gray-300">ref</code> and{" "}
                  <code className="text-gray-300">email</code>, you will see{" "}
                  <code className="text-gray-300">originPage=/register</code>,{" "}
                  <code className="text-gray-300">ref=downloads</code> and{" "}
                  <code className="text-gray-300">email=alice@example.com</code> in your form
                  submissions.
                </p>
                <div className="bg-[#1A1D23] p-4 rounded-lg border border-gray-800 text-sm break-all font-mono">
                  https://company.com/register?ref=downloads&email=alice@example.com
                </div>

                <p className="leading-relaxed">
                  {embedType === "standard"
                    ? "This is enabled only if you use the HTML snippet or JavaScript."
                    : "If you are opening the popup on button click via data attributes, all data attributes will be automatically forwarded to the popup. The example below sets 2 data attributes which can be used as hidden fields: ref and email."}
                </p>
                {embedType === "popup" ? (
                  <>
                    <CodeBlock
                      code={`<button type="button" data-form-id="${formId}" data-ref="downloads" data-email="alice@example.com">Click me</button>`}
                    />
                    <p className="leading-relaxed">
                      If you are opening the popup on button click via custom URL hash, all URL
                      parameters will be automatically forwarded to the popup. The example below
                      sets 2 parameters which can be used as hidden fields:{" "}
                      <code className="text-gray-300">ref</code> and{" "}
                      <code className="text-gray-300">email</code>.
                    </p>
                    <CodeBlock
                      code={`<a href="${hashUrl}&ref=downloads&email=alice@example.com">Click me</a>`}
                    />
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* JavaScript API Accordion */}
          <div className="border-b border-gray-800">
            <button
              type="button"
              onClick={() => toggleSection("js")}
              className="w-full flex items-center justify-between py-6 text-left"
            >
              <span className="text-lg font-semibold text-white">Use JavaScript</span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-gray-500 transition-transform",
                  sections.js && "rotate-180",
                )}
              />
            </button>
            {sections.js && (
              <div className="pb-8 space-y-6 text-gray-400">
                <p className="leading-relaxed">
                  Take a look at the instructions below and share them with your developers.
                </p>

                {embedType === "standard" ? (
                  <CodeBlock
                    code={`// Include the Better Forms widget script in the <head> section of your page
<script src="${window.location.origin}/widgets/embed.js"></script>

// Add the embed in your HTML
<iframe data-better-forms-src="${embedUrl}" loading="lazy" width="100%" height="${options.height}" frameborder="0" marginheight="0" marginwidth="0" title="${docTitle || "Form"}"></iframe>

// Load all embeds on the page
BetterForms.loadEmbeds();`}
                  />
                ) : (
                  <>
                    <p className="leading-relaxed">
                      You can open and close popups using JavaScript via the{" "}
                      <code className="text-gray-300">window.BetterForms</code> object. It comes in
                      handy when you want to define your own business logic on when to open a
                      certain popup.
                    </p>
                    <CodeBlock
                      code={`// Include the Better Forms widget script in the <head> section of your page
<script src="${window.location.origin}/widgets/embed.js"></script>

// Open the popup
BetterForms.openPopup('${formId}', options);

// Close the popup
BetterForms.closePopup('${formId}');`}
                    />
                  </>
                )}

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Available options</h4>
                  <CodeBlock
                    code={`type PopupOptions = {
  key?: string;
  layout?: 'default' | 'modal';
  width?: number;
  alignLeft?: boolean;
  hideTitle?: boolean;
  overlay?: boolean;
  emoji?: {
    text: string;
    animation: 'none' | 'wave' | 'tada' | 'heart-beat' | 'spin' | 'flash' | 'bounce' | 'rubber-band' | 'head-shake';
  };
  autoClose?: number; // Close after N ms on submit
  showOnce?: boolean;
  doNotShowAfterSubmit?: boolean;
  customFormUrl?: string; // For custom domains
  hiddenFields?: {
    [key: string]: any,
  };
  onOpen?: () => void;
  onClose?: () => void;
  onPageView?: (page: number) => void;
  onSubmit?: (payload: any) => void;
};`}
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-white font-semibold italic opacity-80">Examples</h4>

                  <div className="space-y-2">
                    <p className="text-sm">1. Open a popup as a centered modal with delay</p>
                    <CodeBlock
                      code={`BetterForms.openPopup('${formId}', {
  layout: 'modal',
  width: ${options.popupWidth},
  autoClose: 5000, // Close after 5 seconds
});`}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm">2. Set custom hidden fields</p>
                    <CodeBlock
                      code={`BetterForms.openPopup('${formId}', {
  hiddenFields: {
    ref: 'downloads',
    email: 'alice@example.com'
  }
});`}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm">3. Use callback functions to handle events</p>
                    <CodeBlock
                      code={`BetterForms.openPopup('${formId}', {
  onOpen: () => {
    console.log('Popup opened');
  },
  onSubmit: (payload) => {
    console.log('Form submitted', payload);
  }
});`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
