import { Copy, Share2, Rocket, ExternalLink, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useForm } from "@/hooks/use-live-hooks";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { publishForm } from "@/hooks/use-form-versions";
import { EmbedSection } from "./embed-section";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface ShareSummarySidebarProps {
  formId: string;
}

export function ShareSummarySidebar({ formId }: ShareSummarySidebarProps) {
  const { data: savedDocs } = useForm(formId);
  const doc = savedDocs?.[0];

  const shareUrl = doc ? `${window.location.origin}/forms/${doc.id}` : "";

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

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

  if (!doc) return null;

  const isDraft = doc.status === "draft";

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header with tabs */}
      <SidebarHeader className="px-4 py-3 shrink-0 border-b flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Share</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => {
            // This is handled by the parent layout generally,
            // but we can trigger a close action if available.
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </SidebarHeader>

      {/* Scrollable content area */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="p-4 space-y-8">
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
              <div className="space-y-8">
                {/* Share Link Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Share Link
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 uppercase px-1 py-0 h-4"
                      >
                        Live
                      </Badge>
                    </div>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: "link", size: "sm" }),
                        "h-6 text-[11px] p-0 text-muted-foreground hover:text-foreground font-medium flex items-center gap-1",
                      )}
                    >
                      Open <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>

                  <div className="flex gap-1.5">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="h-9 text-[11px] bg-muted border-none focus-visible:ring-0 rounded-[8px] transition-all pr-2"
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 bg-black hover:bg-black/90 text-white rounded-[8px]"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Embed Section */}
                <EmbedSection
                  formId={doc.id}
                  docTitle={doc.title || undefined}
                />
                {/* Link Preview Mockup */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Share2 className="h-3 w-3" />
                    Link Preview
                  </h3>

                  <div className="border border-border rounded-xl p-3 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-2 group">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-3.5 w-3.5 rounded-full bg-black flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">
                          *
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Better Forms
                      </span>
                    </div>

                    <h4 className="font-bold text-primary text-xs line-clamp-1">
                      {doc.title || "Untitled Form"}
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                      Made with Better Forms, the simplest way to create
                      beautiful, high-converting forms.
                    </p>

                    <div className="aspect-video rounded-lg bg-muted/50 border border-muted/50 flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <span className="text-xl font-bold text-primary">
                          *
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
                          Better Forms
                        </p>
                        <p className="text-[8px] text-muted-foreground">
                          Build forms in minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
