import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  if (options.display.title === "hidden") params.append("hideTitle", "true");
  if (options.display.background === "transparent") params.append("transparent", "true");
  if (options.display.alignment === "left") params.append("align", "left");
  if (!options.display.branding) params.append("branding", "false");
  if (options.display.dynamicHeight) params.append("dynamicHeight", "true");
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function generateEmbedCode(
  embedType: EmbedType,
  options: EmbedOptions,
  formId: string,
  docTitle?: string,
): string {
  const embedUrl = generateEmbedUrl(formId, options);

  if (embedType === "standard") {
    const baseUrl = `${window.location.origin}/widgets/embed.js`;
    const dynamicHeightScript = options.display.dynamicHeight
      ? `window.addEventListener("message",function(e){try{var d=JSON.parse(e.data);if(d.event==="Reform.Resize"){var f=document.querySelector('iframe[data-reform-src]');if(f&&typeof d.height==="number")f.style.height=d.height+"px"}}catch{}});`
      : "";
    return `<iframe
  data-reform-src="${embedUrl}"
  loading="lazy"
  width="100%"
  height="${options.height}"
  frameborder="0"
  marginheight="0"
  marginwidth="0"
  title="${docTitle || "Form"}"
></iframe>
<script>${dynamicHeightScript}var d=document,w="${baseUrl}",v=function(){"undefined"!=typeof Reform?Reform.loadEmbeds():d.querySelectorAll("iframe[data-reform-src]:not([src])").forEach((function(e){e.src=e.dataset.reformSrc}))};if("undefined"!=typeof Reform)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w,s.onload=v,s.onerror=v,d.body.appendChild(s);}</script>`;
  }

  if (embedType === "popup") {
    const isDarkOverlay = options.popup.overlay === "dark";
    return `<!-- ${APP_NAME} Popup Embed -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = "${window.location.origin}/embed/popup.js";
    script.setAttribute('data-form-id', '${formId}');
    script.setAttribute('data-position', '${options.popup.position}');
    script.setAttribute('data-width', '${options.popup.width}');
    script.setAttribute('data-trigger', '${options.popup.trigger}');
    ${isDarkOverlay ? "script.setAttribute('data-dark-overlay', 'true');" : ""}
    ${options.popup.emoji ? `script.setAttribute('data-emoji', '${options.popup.emojiIcon}');` : ""}
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
      aria-label="Copy to clipboard"
      className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
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
        aria-label="Embed URL"
        className="h-9 text-[11px] bg-muted/30 focus-visible:ring-primary border-transparent focus:border-primary transition-all pr-2 font-mono"
      />
      <Button
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" />
        )}
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
  const highlighted = useMemo(() => renderHighlighted(code, language), [code, language]);
  const isInline = inline ?? !code.includes("\n");

  if (isInline) {
    return <InlineCopyBar value={code} />;
  }

  return (
    <div className="relative group mt-3 w-full max-w-full overflow-hidden">
      <pre
        className={cn(
          "w-full max-w-full bg-muted/30 border border-border/50 rounded-xl p-4 text-[12px] font-mono text-foreground/90 scrollbar-hide whitespace-pre-wrap break-words overflow-x-hidden [tab-size:2]",
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
  const embedUrl = useMemo(() => generateEmbedUrl(formId, options), [formId, options]);
  const embedCode = useMemo(
    () => generateEmbedCode(embedType, options, formId, docTitle),
    [embedType, options, formId, docTitle],
  );

  const emojiParams = options.popup.emoji
    ? `&emoji-text=${encodeURIComponent(options.popup.emojiIcon)}&emoji-animation=${options.popup.emojiAnimation}`
    : "";
  const isAlignLeft = options.display.alignment === "left";
  const isHideTitle = options.display.title === "hidden";
  const isDarkOverlay = options.popup.overlay === "dark";
  const hashUrl = `#form-open=${formId}&position=${options.popup.position}&align-left=${isAlignLeft ? 1 : 0}&hide-title=${isHideTitle ? 1 : 0}&overlay=${isDarkOverlay ? 1 : 0}${emojiParams}&auto-close=${options.popup.hideOnSubmit ? options.popup.hideOnSubmitDelay * 1000 : 0}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border p-0 [&>button]:text-muted-foreground">
        <div className="p-8 pb-10 space-y-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold text-foreground">
              Add to your website
            </DialogTitle>
            <p className="text-muted-foreground text-[13px] mt-1.5">
              {embedType === "popup"
                ? `Enable the ${APP_NAME} popup on your site with a single script and trigger via button attributes or direct JS.`
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
                  <p className="text-muted-foreground text-[12px] mt-6 mb-4">
                    To{" "}
                    <strong className="text-foreground font-semibold">
                      open the popup on clicking a button
                    </strong>
                    , add{" "}
                    <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] border border-border/50">
                      data-form-id
                    </code>{" "}
                    attributes to any clickable element.
                  </p>
                  <div className="bg-brand/5 border-l-4 border-brand rounded-r-lg p-4 mb-4">
                    <div className="text-[11px] text-foreground/80 font-mono space-y-1">
                      <div className="text-muted-foreground/60">{"// Data attributes"}</div>
                      <div className="break-all">
                        data-form-id="{formId}"{` data-position="${options.popup.position}"`}
                        {isAlignLeft && ` data-align-left="1"`}
                        {isHideTitle && ` data-hide-title="1"`}
                        {isDarkOverlay && ` data-overlay="1"`}
                        {options.popup.emoji &&
                          ` data-emoji-text="${options.popup.emojiIcon}" data-emoji-animation="${options.popup.emojiAnimation}"`}
                        {options.popup.hideOnSubmit &&
                          ` data-auto-close="${options.popup.hideOnSubmitDelay * 1000}"`}
                      </div>
                    </div>
                  </div>
                  <CodeBlock
                    code={`// Example
<button type="button"
  data-form-id="${formId}"
  data-position="${options.popup.position}"${isAlignLeft ? `\n  data-align-left="1"` : ""}${isHideTitle ? `\n  data-hide-title="1"` : ""}${isDarkOverlay ? `\n  data-overlay="1"` : ""}${options.popup.emoji ? `\n  data-emoji-text="${options.popup.emojiIcon}"\n  data-emoji-animation="${options.popup.emojiAnimation}"` : ""}${options.popup.hideOnSubmit ? `\n  data-auto-close="${options.popup.hideOnSubmitDelay * 1000}"` : ""}
>
  Click me
</button>`}
                    language="html"
                  />
                </div>

                <div>
                  <p className="text-muted-foreground text-[12px] mt-8 mb-4">
                    Alternatively,{" "}
                    <strong className="text-foreground font-semibold">open via a link</strong> with
                    a custom URL hash.
                  </p>
                  <div className="bg-brand/5 border-l-4 border-brand rounded-r-lg p-4 mb-4">
                    <div className="text-[11px] text-foreground/80 font-mono space-y-1">
                      <div className="text-muted-foreground/60">{"// Link href"}</div>
                      <div className="break-all">{hashUrl}</div>
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
                <h3 className="text-foreground font-semibold text-[13px] mb-2.5">
                  Full page redirect
                </h3>
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
            <div className="pt-8 border-t border-border">
              <Accordion>
                {/* Query Parameters */}
                <AccordionItem value="save" className="border-b border-border/50">
                  <AccordionTrigger
                    iconPosition="end"
                    className="py-5 px-0 text-[14px] font-semibold text-foreground group-hover:text-brand transition-colors hover:no-underline"
                  >
                    Save website page and query parameters
                  </AccordionTrigger>
                  <AccordionContent className="pb-8 space-y-4 text-muted-foreground text-[12px]">
                    <p>
                      Your page's URL and query parameters are automatically forwarded to the{" "}
                      {embedType === "popup" ? "popup" : "form"} and saved via hidden fields.
                    </p>
                    <div className="bg-muted p-3.5 rounded-lg border border-border/50 text-[11px] break-all font-mono">
                      https://company.com/register?ref=downloads&email=alice@example.com
                    </div>
                    {embedType === "popup" && (
                      <div className="pt-2">
                        <p className="mb-3">
                          Data attributes on triggers become hidden fields automatically.
                        </p>
                        <CodeBlock
                          code={`<button type="button" data-form-id="${formId}" data-ref="downloads" data-email="alice@example.com">Click me</button>`}
                          language="html"
                        />
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* JavaScript API */}
                <AccordionItem value="js" className="border-b border-border/50">
                  <AccordionTrigger
                    iconPosition="end"
                    className="py-5 px-0 text-[14px] font-semibold text-foreground group-hover:text-brand transition-colors hover:no-underline"
                  >
                    Use JavaScript
                  </AccordionTrigger>
                  <AccordionContent className="pb-8 space-y-5 text-muted-foreground text-[12px]">
                    <p className="opacity-80">Share these instructions with your developers.</p>

                    {embedType === "standard" ? (
                      <CodeBlock
                        code={`// Include the ${APP_NAME} widget script
<script src="${window.location.origin}/widgets/embed.js"></script>

// Add the embed in your HTML
<iframe data-reform-src="${embedUrl}" loading="lazy" width="100%" height="${options.height}" frameborder="0" title="${docTitle || "Form"}"></iframe>

// Load all embeds
Reform.loadEmbeds();`}
                        language="javascript"
                      />
                    ) : (
                      <div className="space-y-4">
                        <p>
                          Open and close popups via{" "}
                          <code className="text-foreground font-mono bg-muted px-1 rounded">
                            window.Reform
                          </code>
                          .
                        </p>
                        <CodeBlock
                          code={`// Include the script
<script src="${window.location.origin}/widgets/embed.js"></script>

// Open popup
Reform.openPopup('${formId}', options);

// Close popup
Reform.closePopup('${formId}');`}
                          language="javascript"
                        />
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-border/30">
                      <h4 className="text-foreground font-semibold text-[13px]">
                        Available options
                      </h4>
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
                      <h4 className="text-foreground font-semibold text-[13px] italic opacity-80 border-b border-border/30 pb-2">
                        Examples
                      </h4>
                      <div className="space-y-3">
                        <p className="text-[12px] text-foreground/80">
                          1. Open as centered modal with delay
                        </p>
                        <CodeBlock
                          code={`Reform.openPopup('${formId}', {
  layout: 'modal',
  width: ${options.popup.width},
  autoClose: 5000,
});`}
                          language="javascript"
                        />
                      </div>
                      <div className="space-y-3">
                        <p className="text-[12px] text-foreground/80">
                          2. Set custom hidden fields
                        </p>
                        <CodeBlock
                          code={`Reform.openPopup('${formId}', {
  hiddenFields: {
    ref: 'downloads',
    email: 'alice@example.com'
  }
});`}
                          language="javascript"
                        />
                      </div>
                      <div className="space-y-3">
                        <p className="text-[12px] text-foreground/80">3. Handle events</p>
                        <CodeBlock
                          code={`Reform.openPopup('${formId}', {
  onOpen: () => console.log('Opened'),
  onSubmit: (payload) => console.log('Submitted', payload)
});`}
                          language="javascript"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
