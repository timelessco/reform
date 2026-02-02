import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Input } from "@/components/ui/input";
import { updateFormStatus } from "@/db-collections";
import { useForm } from "@/hooks/use-live-hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Layout, Maximize, Rocket, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId/share",
)({
	component: SharePage,
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function SharePage() {
	const { formId, workspaceId } = Route.useParams();
	const { data: savedDocs } = useForm(formId);
	const doc = savedDocs?.[0];
	const [isPublishing, setIsPublishing] = useState(false);

	// Construct the share URL (assuming a standard structure)
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
		<div className="p-8 md:p-12 max-w-5xl mx-auto w-full space-y-12">
			{isDraft ? (
				<div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-8 bg-muted/20 border-2 border-dashed rounded-3xl animate-in fade-in zoom-in duration-500">
					<div className="p-4 bg-primary/10 rounded-full">
						<Rocket className="h-10 w-10 text-primary animate-bounce-subtle" />
					</div>
					<div className="space-y-3 max-w-md">
						<h2 className="text-3xl font-bold tracking-tight">
							Ready to go live?
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							Your form is currently in{" "}
							<Badge variant="secondary" className="px-1.5 py-0">
								draft
							</Badge>
							. Publish it to get a shareable link and start collecting
							responses.
						</p>
					</div>
					<Button
						size="lg"
						onClick={handlePublish}
						disabled={isPublishing}
						className="h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold gap-2"
					>
						{isPublishing ? (
							"Publishing..."
						) : (
							<>
								<Rocket className="h-5 w-5" />
								<span>Publish Now</span>
							</>
						)}
					</Button>
				</div>
			) : (
				<>
					{/* Share Link Section */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="space-y-6">
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<h2 className="text-2xl font-bold tracking-tight">
										Share Link
									</h2>
									<Badge
										variant="outline"
										className="text-[10px] bg-green-50 text-green-700 border-green-200 uppercase font-bold tracking-wider"
									>
										Live
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
									Your form is published and ready to be shared! Copy this link
									to share it on social media, messaging apps, or via email.
								</p>
							</div>

							<div className="flex gap-2 group">
								<Input
									value={shareUrl}
									readOnly
									className="h-11 bg-muted/30 focus-visible:ring-primary border-transparent focus:border-primary transition-all pr-4"
								/>
								<Button
									onClick={handleCopy}
									className="h-11 px-6 gap-2 shrink-0 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
								>
									<Copy className="h-4 w-4" />
									<span>Copy Link</span>
								</Button>
							</div>

							<Button
								variant="link"
								className="text-xs p-0 h-auto text-muted-foreground hover:text-foreground"
							>
								Use custom domain
							</Button>
						</div>

						{/* Link Preview Mockup */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
									<Share2 className="h-3.5 w-3.5" />
									Link Preview
								</h3>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 text-blue-600 text-xs gap-1.5 px-2 hover:bg-blue-50"
								>
									Customize{" "}
									<Badge className="text-[9px] h-3.5 px-1 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
										PRO
									</Badge>
								</Button>
							</div>

							<div className="border rounded-2xl p-5 bg-background shadow-sm space-y-3 max-w-sm mx-auto md:mx-0 group hover:shadow-md transition-shadow ring-1 ring-black/5">
								<div className="flex items-center gap-2 mb-3">
									<div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
										<span className="text-[10px] text-white font-bold">*</span>
									</div>
									<span className="text-[11px] font-semibold text-muted-foreground">
										Better Forms
									</span>
								</div>

								<h4 className="font-bold text-primary text-base line-clamp-1">
									{doc?.title || "Untitled Form"}
								</h4>
								<p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
									Made with Better Forms, the simplest way to create beautiful,
									high-converting forms.
								</p>

								<div className="aspect-[1.91/1] rounded-xl bg-muted/50 border border-muted/50 flex flex-col items-center justify-center p-6 text-center space-y-3 group-hover:bg-muted/80 transition-colors">
									<div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-sm">
										<span className="text-2xl font-bold text-primary">*</span>
									</div>
									<div className="space-y-1">
										<p className="text-[10px] font-bold text-primary uppercase tracking-widest">
											Better Forms
										</p>
										<p className="text-[9px] text-muted-foreground font-medium">
											Build forms in minutes, not hours.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Embed Form Section */}
					<div className="space-y-8 pt-10 border-t animate-in fade-in duration-700">
						<div className="space-y-2">
							<h2 className="text-2xl font-bold tracking-tight">Embed Form</h2>
							<p className="text-sm text-muted-foreground">
								Use these options to seamlessly embed your form into your
								website or landing pages.
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
							{/* Standard Embed */}
							<Link
								to="/workspace/$workspaceId/form-builder/$formId/embed"
								params={{ workspaceId, formId }}
								search={{ type: "standard" }}
								className="group cursor-pointer space-y-4 block"
							>
								<div className="aspect-video rounded-2xl border-2 border-muted bg-muted/5 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all p-5 flex items-center justify-center overflow-hidden">
									<div className="w-full h-full border rounded-xl bg-white shadow-sm p-4 space-y-3">
										<div className="w-2/3 h-2 bg-muted/60 rounded-full"></div>
										<div className="w-1/2 h-2 bg-muted/40 rounded-full"></div>
										<div className="w-full h-14 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
											<Layout className="h-5 w-5 text-primary/60" />
										</div>
									</div>
								</div>
								<div className="text-center">
									<p className="font-bold text-sm group-hover:text-primary transition-colors">
										Standard
									</p>
									<p className="text-[11px] text-muted-foreground mt-0.5">
										Embed as a section
									</p>
								</div>
							</Link>

							{/* Popup Embed */}
							<Link
								to="/workspace/$workspaceId/form-builder/$formId/embed"
								params={{ workspaceId, formId }}
								search={{ type: "popup" }}
								className="group cursor-pointer space-y-4 block"
							>
								<div className="aspect-video rounded-2xl border-2 border-muted bg-muted/5 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all p-5 flex items-center justify-center overflow-hidden">
									<div className="w-full h-full border rounded-xl bg-white shadow-sm p-4 relative space-y-3">
										<div className="w-2/3 h-2 bg-muted/40 rounded-full"></div>
										<div className="w-1/2 h-2 bg-muted/30 rounded-full"></div>
										<div className="absolute bottom-4 right-4 w-2/5 h-3/5 border rounded-lg bg-white shadow-xl p-2.5 space-y-1.5 ring-1 ring-black/5 scale-90 group-hover:scale-100 transition-transform">
											<div className="w-full h-1 bg-muted/60 rounded-full"></div>
											<div className="w-2/3 h-1 bg-muted/40 rounded-full"></div>
											<div className="flex-1"></div>
											<div className="w-full h-2.5 bg-primary/80 rounded-sm"></div>
										</div>
									</div>
								</div>
								<div className="text-center">
									<p className="font-bold text-sm group-hover:text-primary transition-colors">
										Popup
									</p>
									<p className="text-[11px] text-muted-foreground mt-0.5">
										Show as a popover
									</p>
								</div>
							</Link>

							{/* Full Page Embed */}
							<Link
								to="/workspace/$workspaceId/form-builder/$formId/embed"
								params={{ workspaceId, formId }}
								search={{ type: "fullpage" }}
								className="group cursor-pointer space-y-4 block"
							>
								<div className="aspect-video rounded-2xl border-2 border-muted bg-muted/5 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all p-5 flex flex-col items-center justify-center overflow-hidden">
									<div className="w-full h-full border rounded-xl bg-primary/5 shadow-sm flex flex-col items-center justify-center space-y-3 group-hover:bg-primary/10 transition-colors">
										<div className="w-1/2 h-2.5 bg-primary/20 rounded-full"></div>
										<div className="w-1/3 h-2 bg-primary/15 rounded-full"></div>
										<Maximize className="h-5 w-5 text-primary/40 mt-2" />
									</div>
								</div>
								<div className="text-center">
									<p className="font-bold text-sm group-hover:text-primary transition-colors">
										Full Page
									</p>
									<p className="text-[11px] text-muted-foreground mt-0.5">
										Instant landing page
									</p>
								</div>
							</Link>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
