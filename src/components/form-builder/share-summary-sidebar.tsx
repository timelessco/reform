import { Copy, Share2, BarChart3, Rocket, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";
import { useForm } from "@/hooks/use-live-hooks";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { updateFormStatus } from "@/db-collections";
import { EmbedSection } from "./embed-section";

interface ShareSummarySidebarProps {
    formId: string;
}

export function ShareSummarySidebar({ formId }: ShareSummarySidebarProps) {
    const { shareTab, setShareTab } = useEditorSidebar();
    const { data: savedDocs } = useForm(formId);
    const doc = savedDocs?.[0];
    const [isPublishing, setIsPublishing] = useState(false);

    const shareUrl = doc ? `${window.location.origin}/forms/${doc.id}` : "";

    const handleCopy = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard");
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await updateFormStatus(formId, "published");
            toast.success("Form published successfully!");
        } catch (error) {
            toast.error("Failed to publish form");
            console.error(error);
        } finally {
            setIsPublishing(false);
        }
    };

    if (!doc) return null;

    const isDraft = doc.status === "draft";

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background border-l w-full">
            {/* Header with tabs */}
            <div className="shrink-0">
                {/* Tab Navigation - underline style like FormSettingsSidebar */}
                <div className="px-4 pt-4 flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => setShareTab("share")}
                        className={cn(
                            "pb-3 text-sm font-medium transition-colors relative",
                            shareTab === "share"
                                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        Share
                    </button>
                    <button
                        type="button"
                        onClick={() => setShareTab("summary")}
                        className={cn(
                            "pb-3 text-sm font-medium transition-colors relative",
                            shareTab === "summary"
                                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        Summary
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="border-b" />

            {/* Scrollable content area — takes remaining height */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {shareTab === "share" ? (
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-8">
                            {isDraft ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-6 bg-muted/20 border-2 border-dashed rounded-2xl">
                                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                                        <Rocket className="h-8 w-8 animate-bounce-subtle" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold">Ready to go live?</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Your form is currently in draft. Publish it to start collecting responses.
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={handlePublish}
                                        disabled={isPublishing}
                                        className="w-full font-semibold gap-2"
                                    >
                                        {isPublishing ? "Publishing..." : "Publish Now"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Share Link Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Share Link
                                                </label>
                                                <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200 uppercase px-1 py-0">
                                                    Live
                                                </Badge>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 text-[11px] p-0 text-primary hover:bg-transparent" asChild>
                                                <a href={shareUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                                                    Open <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            </Button>
                                        </div>

                                        <div className="flex gap-1.5">
                                            <Input
                                                value={shareUrl}
                                                readOnly
                                                className="h-9 text-[11px] bg-muted/30 focus-visible:ring-primary border-transparent focus:border-primary transition-all pr-2"
                                            />
                                            <Button
                                                size="icon"
                                                className="h-9 w-9 shrink-0"
                                                onClick={handleCopy}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Link Preview Mockup */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
                                            <Share2 className="h-3.5 w-3.5" />
                                            Link Preview
                                        </h3>

                                        <div className="border rounded-xl p-3 bg-background shadow-sm space-y-2 group ring-1 ring-black/5">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                                    <span className="text-[8px] text-white font-bold">*</span>
                                                </div>
                                                <span className="text-[10px] font-semibold text-muted-foreground">
                                                    Better Forms
                                                </span>
                                            </div>

                                            <h4 className="font-bold text-primary text-xs line-clamp-1">
                                                {doc.title || "Untitled Form"}
                                            </h4>
                                            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                                                Made with Better Forms, the simplest way to create beautiful, high-converting forms.
                                            </p>

                                            <div className="aspect-video rounded-lg bg-muted/50 border border-muted/50 flex flex-col items-center justify-center p-4 text-center space-y-2">
                                                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                                    <span className="text-xl font-bold text-primary">*</span>
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

                                    {/* Embed Section */}
                                    <EmbedSection
                                        formId={doc.id}
                                        docTitle={doc.title || undefined}
                                    />
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">Summary View</h3>
                                <p className="text-xs text-muted-foreground">
                                    View a high-level summary of your form responses and completion rates. This feature is coming soon!
                                </p>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                View Analytics
                            </Button>
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
