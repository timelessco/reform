import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";
import type { EmbedOptions } from "./embed-config-panel";
import { all, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(all);
const hljsClassName =
  "py-1 **:[.hljs-addition]:bg-[#f0fff4] **:[.hljs-addition]:text-[#22863a] dark:**:[.hljs-addition]:bg-[#3c5743] dark:**:[.hljs-addition]:text-[#ceead5] **:[.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable]:text-[#005cc5] dark:**:[.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable]:text-[#6596cf] **:[.hljs-built\\\\_in,.hljs-symbol]:text-[#e36209] dark:**:[.hljs-built\\\\_in,.hljs-symbol]:text-[#c3854e] **:[.hljs-bullet]:text-[#735c0f] **:[.hljs-comment,.hljs-code,.hljs-formula]:text-[#6a737d] dark:**:[.hljs-comment,.hljs-code,.hljs-formula]:text-[#6a737d] **:[.hljs-deletion]:bg-[#ffeef0] **:[.hljs-deletion]:text-[#b31d28] dark:**:[.hljs-deletion]:bg-[#473235] dark:**:[.hljs-deletion]:text-[#e7c7cb] **:[.hljs-emphasis]:italic **:[.hljs-keyword,.hljs-doctag,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language\\\\_]:text-[#d73a49] dark:**:[.hljs-keyword,.hljs-doctag,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language\\\\_]:text-[#ee6960] **:[.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo]:text-[#22863a] dark:**:[.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo]:text-[#36a84f] **:[.hljs-regexp,.hljs-string,.hljs-meta_.hljs-string]:text-[#032f62] dark:**:[.hljs-regexp,.hljs-string,.hljs-meta_.hljs-string]:text-[#3593ff] **:[.hljs-section]:font-bold **:[.hljs-section]:text-[#005cc5] dark:**:[.hljs-section]:text-[#61a5f2] **:[.hljs-strong]:font-bold **:[.hljs-title,.hljs-title.class\\\\_,.hljs-title.class\\\\_.inherited\\\\_\\\\_,.hljs-title.function\\\\_]:text-[#6f42c1] dark:**:[.hljs-title,.hljs-title.class\\\\_,.hljs-title.class\\\\_.inherited\\\\_\\\\_,.hljs-title.function\\\\_]:text-[#a77bfa]";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHighlighted(code: string, language?: string) {
  try {
    const tree = language ? lowlight.highlight(language, code) : lowlight.highlightAuto(code);
    return toHtml(tree);
  } catch {
    try {
      const tree = lowlight.highlightAuto(code);
      return toHtml(tree);
    } catch {
      return escapeHtml(code);
    }
  }
}

interface EmbedCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedType: EmbedType;
  options: EmbedOptions;
  formId: string;
  docTitle?: string;
}

export function generateEmbedUrl(formId: string, options: EmbedOptions): string {
  const baseUrl = `${window.location.origin}/forms/${formId}`;
  const params = new URLSearchParams();
  if (options.hideTitle) params.append("hideTitle", "true");
  if (options.transparentBackground) params.append("transparent", "true");
  if (options.alignLeft) params.append("align", "left");
  if (!options.branding) params.append("branding", "false");
  if (options.dynamicHeight) params.append("dynamicHeight", "true");
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function generateEmbedCode(
  embedType: EmbedType,
  options: EmbedOptions,
  formId: string,
  docTitle?: string,
): string {
  const embedUrl = generateEmbedUrl(formId, options);

  if (embedType === "standard") {
    const baseUrl = `${window.location.origin}/widgets/embed.js`;
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
  title="${docTitle || "Form"}"
></iframe>
<script>${dynamicHeightScript}var d=document,w="${baseUrl}",v=function(){"undefined"!=typeof BetterForms?BetterForms.loadEmbeds():d.querySelectorAll("iframe[data-better-forms-src]:not([src])").forEach((function(e){e.src=e.dataset.betterFormsSrc}))};if("undefined"!=typeof BetterForms)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w,s.onload=v,s.onerror=v,d.body.appendChild(s);}</script>`;
  }

  if (embedType === "popup") {
    return `<!-- Better Forms Popup Embed -->
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
  return `<!-- Redirect to full page form -->
<meta http-equiv="refresh" content="0; url=${embedUrl}" />

<!-- Or link to it -->
<a href="${embedUrl}">Open Form</a>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function InlineCopyBar({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-1.5">
      <Input
        value={value}
        readOnly
        className="h-9 text-[11px] bg-muted/30 focus-visible:ring-primary border-transparent focus:border-primary transition-all pr-2 font-mono"
      />
      <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function CodeBlock({
  code,
  language,
  inline,
}: {
  code: string;
  language?: string;
  inline?: boolean;
}) {
  const isInline = inline ?? !code.includes("\n");
  if (isInline) {
    return <InlineCopyBar value={code} />;
  }

  const highlighted = useMemo(() => renderHighlighted(code, language), [code, language]);
  return (
    <div className="relative group mt-3 w-full max-w-full overflow-hidden">
      <pre
        className={cn(
          "w-full max-w-full bg-muted/30 border border-border/50 rounded-xl p-4 text-[12px] font-mono text-foreground/90 leading-relaxed scrollbar-hide whitespace-pre-wrap break-words overflow-x-hidden [tab-size:2]",
          hljsClassName,
        )}
      >
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      <div className="absolute top-0 right-0 p-1">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

export function EmbedCodeDialog({
  open,
  onOpenChange,
  embedType,
  options,
  formId,
  docTitle,
}: EmbedCodeDialogProps) {
  const [sections, setSections] = useState<Record<string, boolean>>({
    save: false,
    js: false,
  });

  const toggleSection = (section: string) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const embedUrl = useMemo(() => generateEmbedUrl(formId, options), [formId, options]);
  const embedCode = useMemo(
    () => generateEmbedCode(embedType, options, formId, docTitle),
    [embedType, options, formId, docTitle],
  );

  const emojiParams = options.emoji
    ? `&emoji-text=${encodeURIComponent(options.emojiIcon)}&emoji-animation=${options.emojiAnimation}`
    : "";
  const hashUrl = `#form-open=${formId}&position=${options.popupPosition}&align-left=${options.alignLeft ? 1 : 0}&hide-title=${options.hideTitle ? 1 : 0}&overlay=${options.darkOverlay ? 1 : 0}${emojiParams}&auto-close=${options.hideOnSubmit ? options.hideOnSubmitDelay * 1000 : 0}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border p-0 [&>button]:text-muted-foreground">
        <div className="p-8 pb-10 space-y-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
              Add to your website
            </DialogTitle>
            <p className="text-muted-foreground text-[13px] leading-relaxed mt-1.5">
              {embedType === "popup"
                ? "Enable the Better Forms popup on your site with a single script and trigger via button attributes or direct JS."
                : "Integrate this form seamlessly into your website using the snippet below."}
            </p>
          </DialogHeader>

          <div className="space-y-10">
            {embedType === "standard" ? (
              <div className="space-y-10">
                <div>
                  <h3 className="text-foreground font-semibold text-[13px] mb-2.5">Embed code</h3>
                  <p className="text-muted-foreground text-[12px] mb-3.5">
                    Paste this HTML code snippet on the page where you want the embed to appear.
                  </p>
                  <CodeBlock code={embedCode} language="html" />
                </div>

                <div>
                  <h3 className="text-foreground font-semibold text-[13px] mb-2.5">Direct link</h3>
                  <p className="text-muted-foreground text-[12px] mb-3.5">
                    Alternatively, paste this link in a no-code tool (Notion, Ghost, Canva, etc).
                  </p>
                  <div className="mb-4">
                    <InlineCopyBar value={embedUrl} />
                  </div>
                  <CodeBlock
                    code={`<script async src="${window.location.origin}/widgets/embed.js"></script>`}
                    language="html"
                  />
                </div>
              </div>
            ) : embedType === "popup" ? (
              <>
                <div>
                  <CodeBlock
                    code={`<script async src="${window.location.origin}/embed/popup.js"></script>`}
                    language="html"
                  />
                </div>

                <div>
                  <p className="text-muted-foreground text-[12px] mt-6 mb-4 leading-relaxed">
                    To <strong className="text-foreground font-semibold">open the popup on clicking a button</strong>,
                    add{" "}
                    <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] border border-border/50">
                      data-form-id
                    </code>{" "}
                    attributes to any clickable element.
                  </p>
                  <div className="bg-brand/5 border-l-4 border-brand rounded-r-lg p-4 mb-4">
                    <div className="text-[11px] text-foreground/80 font-mono space-y-1">
                      <div className="text-muted-foreground/60">{"// Data attributes"}</div>
                      <div className="break-all leading-relaxed">
                        data-form-id="{formId}"
                        {` data-position="${options.popupPosition}"`}
                        {options.alignLeft && ` data-align-left="1"`}
                        {options.hideTitle && ` data-hide-title="1"`}
                        {options.darkOverlay && ` data-overlay="1"`}
                        {options.emoji && ` data-emoji-text="${options.emojiIcon}" data-emoji-animation="${options.emojiAnimation}"`}
                        {options.hideOnSubmit && ` data-auto-close="${options.hideOnSubmitDelay * 1000}"`}
                      </div>
                    </div>
                  </div>
                  <CodeBlock
                    code={`// Example
<button type="button"
  data-form-id="${formId}"
  data-position="${options.popupPosition}"${options.alignLeft ? `\n  data-align-left="1"` : ""}${options.hideTitle ? `\n  data-hide-title="1"` : ""}${options.darkOverlay ? `\n  data-overlay="1"` : ""}${options.emoji ? `\n  data-emoji-text="${options.emojiIcon}"\n  data-emoji-animation="${options.emojiAnimation}"` : ""}${options.hideOnSubmit ? `\n  data-auto-close="${options.hideOnSubmitDelay * 1000}"` : ""}
>
  Click me
</button>`}
                    language="html"
                  />
                </div>

                <div>
                  <p className="text-muted-foreground text-[12px] mt-8 mb-4">
                    Alternatively,{" "}
                    <strong className="text-foreground font-semibold">open via a link</strong> with a custom URL hash.
                  </p>
                  <div className="bg-brand/5 border-l-4 border-brand rounded-r-lg p-4 mb-4">
                    <div className="text-[11px] text-foreground/80 font-mono space-y-1">
                      <div className="text-muted-foreground/60">{"// Link href"}</div>
                      <div className="break-all leading-relaxed">{hashUrl}</div>
                    </div>
                  </div>
                  <CodeBlock
                    code={`// Example\n<a href="${hashUrl}">\n  Click me\n</a>`}
                    language="html"
                  />
                </div>
              </>
            ) : (
              /* Full page */
              <div>
                <h3 className="text-foreground font-semibold text-[13px] mb-2.5">Full page redirect</h3>
                <p className="text-muted-foreground text-[12px] mb-3.5">
                  Use a meta redirect or link to send visitors directly to your form.
                </p>
                <CodeBlock code={embedCode} language="html" />
                <div className="mt-5">
                  <InlineCopyBar value={embedUrl} />
                </div>
              </div>
            )}

            {/* Documentation Accordions */}
            <div className="pt-8 border-t border-border space-y-1">
              {/* Query Parameters */}
              <div className="border-b border-border/50">
                <button
                  type="button"
                  onClick={() => toggleSection("save")}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="text-[14px] font-semibold text-foreground group-hover:text-brand transition-colors">
                    Save website page and query parameters
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground/50 transition-transform group-hover:text-brand",
                      sections.save && "rotate-180",
                    )}
                  />
                </button>
                {sections.save && (
                  <div className="pb-8 space-y-4 text-muted-foreground text-[12px]">
                    <p className="leading-relaxed">
                      Your page's URL and query parameters are automatically forwarded to the{" "}
                      {embedType === "popup" ? "popup" : "form"} and saved via hidden fields.
                    </p>
                    <div className="bg-muted p-3.5 rounded-lg border border-border/50 text-[11px] break-all font-mono">
                      https://company.com/register?ref=downloads&email=alice@example.com
                    </div>
                    {embedType === "popup" && (
                      <div className="pt-2">
                        <p className="leading-relaxed mb-3">
                          Data attributes on triggers become hidden fields automatically.
                        </p>
                        <CodeBlock
                          code={`<button type="button" data-form-id="${formId}" data-ref="downloads" data-email="alice@example.com">Click me</button>`}
                          language="html"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* JavaScript API */}
              <div className="border-b border-border/50">
                <button
                  type="button"
                  onClick={() => toggleSection("js")}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="text-[14px] font-semibold text-foreground group-hover:text-brand transition-colors">Use JavaScript</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground/50 transition-transform group-hover:text-brand",
                      sections.js && "rotate-180",
                    )}
                  />
                </button>
                {sections.js && (
                  <div className="pb-8 space-y-5 text-muted-foreground text-[12px]">
                    <p className="leading-relaxed opacity-80">
                      Share these instructions with your developers.
                    </p>

                    {embedType === "standard" ? (
                      <CodeBlock
                        code={`// Include the Better Forms widget script
<script src="${window.location.origin}/widgets/embed.js"></script>

// Add the embed in your HTML
<iframe data-better-forms-src="${embedUrl}" loading="lazy" width="100%" height="${options.height}" frameborder="0" title="${docTitle || "Form"}"></iframe>

// Load all embeds
BetterForms.loadEmbeds();`}
                        language="javascript"
                      />
                    ) : (
                      <div className="space-y-4">
                        <p className="leading-relaxed">
                          Open and close popups via{" "}
                          <code className="text-foreground font-mono bg-muted px-1 rounded">window.BetterForms</code>.
                        </p>
                        <CodeBlock
                          code={`// Include the script
<script src="${window.location.origin}/widgets/embed.js"></script>

// Open popup
BetterForms.openPopup('${formId}', options);

// Close popup
BetterForms.closePopup('${formId}');`}
                          language="javascript"
                        />
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-border/30">
                      <h4 className="text-foreground font-semibold text-[13px]">Available options</h4>
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
  autoClose?: number;
  hiddenFields?: { [key: string]: any };
  onOpen?: () => void;
  onClose?: () => void;
  onPageView?: (page: number) => void;
  onSubmit?: (payload: any) => void;
};`}
                        language="typescript"
                      />
                    </div>

                    <div className="space-y-5 pt-6">
                      <h4 className="text-foreground font-semibold text-[13px] italic opacity-80 border-b border-border/30 pb-2">Examples</h4>
                      <div className="space-y-3">
                        <p className="text-[12px] font-medium text-foreground/80">1. Open as centered modal with delay</p>
                        <CodeBlock
                          code={`BetterForms.openPopup('${formId}', {
  layout: 'modal',
  width: ${options.popupWidth},
  autoClose: 5000,
});`}
                          language="javascript"
                        />
                      </div>
                      <div className="space-y-3">
                        <p className="text-[12px] font-medium text-foreground/80">2. Set custom hidden fields</p>
                        <CodeBlock
                          code={`BetterForms.openPopup('${formId}', {
  hiddenFields: {
    ref: 'downloads',
    email: 'alice@example.com'
  }
});`}
                          language="javascript"
                        />
                      </div>
                      <div className="space-y-3">
                        <p className="text-[12px] font-medium text-foreground/80">3. Handle events</p>
                        <CodeBlock
                          code={`BetterForms.openPopup('${formId}', {
  onOpen: () => console.log('Opened'),
  onSubmit: (payload) => console.log('Submitted', payload)
});`}
                          language="javascript"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
