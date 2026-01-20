import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Layout, Maximize } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "@/hooks/use-live-hooks";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute(
    "/_authenticated/workspace/$workspaceId/form-builder/$formId/share",
)({
    component: SharePage,
});

function SharePage() {
    const { formId } = Route.useParams();
    const savedDocs = useForm(formId);
    const doc = savedDocs?.[0];

    // Construct the share URL (assuming a standard structure)
    const shareUrl = doc ? `${window.location.origin}/forms/${doc.id}` : "";

    const handleCopy = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard");
        }
    };

    return (
        <div className="p-8 md:p-12 max-w-5xl mx-auto w-full space-y-12">
            {/* Share Link Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Share Link</h2>
                        <p className="text-sm text-muted-foreground">
                            Your form is now published and ready to be shared with the world! Copy
                            this link to share your form on social media, messaging apps or via email.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Input value={shareUrl} readOnly className="h-10 bg-muted/30" />
                        <Button onClick={handleCopy} className="h-10 gap-2 shrink-0">
                            <Copy className="h-4 w-4" />
                            <span>Copy</span>
                        </Button>
                    </div>

                    <Button variant="link" className="text-xs p-0 h-auto text-muted-foreground hover:text-foreground">
                        Use custom domain
                    </Button>
                </div>

                {/* Link Preview Mockup */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Link Preview
                        </h3>
                        <Button variant="ghost" size="sm" className="h-7 text-blue-600 text-xs gap-1.5 px-2">
                            Customize <Badge className="text-[9px] h-3.5 px-1 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">PRO</Badge>
                        </Button>
                    </div>

                    <div className="border rounded-xl p-4 bg-background shadow-sm space-y-2 max-w-sm mx-auto md:mx-0">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold">*</span>
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">Better Forms</span>
                        </div>

                        <h4 className="font-semibold text-blue-600 text-sm">{doc?.title || "Untitled Form"}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Made with Better Forms, the simplest way to create forms.
                        </p>

                        <div className="aspect-[1.91/1] rounded-lg bg-muted/50 border border-muted flex flex-col items-center justify-center p-6 text-center space-y-2">
                            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                <span className="text-xl font-bold text-blue-600">*</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-medium text-blue-600 uppercase tracking-tight">Better Forms</p>
                                <p className="text-[8px] text-muted-foreground">The simplest way to create forms for free.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embed Form Section */}
            <div className="space-y-6 pt-6 border-t">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Embed Form</h2>
                    <p className="text-sm text-muted-foreground">
                        Use these options to embed your form into your own website.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {/* Standard Embed */}
                    <div className="group cursor-pointer space-y-3">
                        <div className="aspect-video rounded-xl border-2 border-muted bg-muted/10 group-hover:border-blue-500/50 group-hover:bg-blue-50/30 transition-all p-4 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full border rounded bg-white shadow-sm p-3 space-y-2">
                                <div className="w-2/3 h-2 bg-muted rounded"></div>
                                <div className="w-1/2 h-2 bg-muted rounded"></div>
                                <div className="w-full h-12 bg-blue-50/50 rounded-sm border border-blue-100 flex items-center justify-center">
                                    <Layout className="h-4 w-4 text-blue-400" />
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-sm">Standard</p>
                        </div>
                    </div>

                    {/* Popup Embed */}
                    <div className="group cursor-pointer space-y-3">
                        <div className="aspect-video rounded-xl border-2 border-muted bg-muted/10 group-hover:border-blue-500/50 group-hover:bg-blue-50/30 transition-all p-4 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full border rounded bg-white shadow-sm p-3 relative space-y-2">
                                <div className="w-2/3 h-2 bg-muted/50 rounded"></div>
                                <div className="w-1/2 h-2 bg-muted/50 rounded"></div>
                                <div className="absolute bottom-3 right-3 w-1/3 h-1/2 border rounded bg-white shadow-lg p-2 space-y-1 ring-1 ring-black/5">
                                    <div className="w-full h-1 bg-muted rounded"></div>
                                    <div className="w-2/3 h-1 bg-muted rounded"></div>
                                    <div className="flex-1"></div>
                                    <div className="w-full h-2 bg-blue-500 rounded-sm"></div>
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-sm">Popup</p>
                        </div>
                    </div>

                    {/* Full Page Embed */}
                    <div className="group cursor-pointer space-y-3">
                        <div className="aspect-video rounded-xl border-2 border-muted bg-muted/10 group-hover:border-blue-500/50 group-hover:bg-blue-50/30 transition-all p-4 flex flex-col items-center justify-center overflow-hidden">
                            <div className="w-full h-full border rounded bg-blue-50/30 shadow-sm flex flex-col items-center justify-center space-y-2">
                                <div className="w-1/2 h-2 bg-blue-200/50 rounded"></div>
                                <div className="w-1/3 h-2 bg-blue-200/50 rounded"></div>
                                <Maximize className="h-4 w-4 text-blue-400 mt-2" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-sm">Full page</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
