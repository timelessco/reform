import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "@/hooks/use-live-hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Code,
	Copy,
	HelpCircle,
	X,
	Check,
	Sparkles,
	Eye,
	ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { FormPreviewFromPlate } from "@/components/form-components/form-preview-from-plate";
import type { Value } from "platejs";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import z from "zod";

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId/embed",
)({
	component: EmbedPage,
	validateSearch: z.object({
		type: z.enum(["standard", "popup", "fullpage"]).optional(),
		showCode: z.boolean().catch(false).optional(),
	}),
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

	const [embedType, setEmbedType] = useState<EmbedType>("standard");
	const showCode = search.showCode ?? false;

	const [options, setOptions] = useState<EmbedOptions>({
		height: 558,
		dynamicHeight: true,
		hideTitle: false,
		alignLeft: false,
		transparentBackground: false,
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
		const queryString = params.toString();
		return queryString ? `${baseUrl}?${queryString}` : baseUrl;
	}, [formId, options]);

	const embedCode = useMemo(() => {
		if (embedType === "standard") {
			return `<iframe
  src="${embedUrl}"
  width="100%"
  height="${options.height}px"
  frameborder="0"
  marginheight="0"
  marginwidth="0"
  title="${doc?.title || "Form"}"
></iframe>`;
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
	}, [embedType, embedUrl, options, formId, doc?.title]);

	const handleCopyLink = () => {
		navigator.clipboard.writeText(embedUrl);
		setCopiedLink(true);
		toast.success("Embed link copied to clipboard");
		setTimeout(() => setCopiedLink(false), 2000);
	};

	const updateOption = <K extends keyof EmbedOptions>(
		key: K,
		value: EmbedOptions[K],
	) => {
		setOptions((prev) => ({ ...prev, [key]: value }));
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
		<div className="fixed inset-0 bg-background z-50 flex flex-col">
			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left Sidebar - Options */}
				<div className="w-[360px] border-r bg-background overflow-y-auto flex flex-col">
					{/* Sidebar Header */}
					<div className="flex items-center justify-between px-6 py-5 shrink-0">
						<h1 className="text-xl font-bold tracking-tight text-foreground">Embed</h1>
						<Link
							to="/workspace/$workspaceId/form-builder/$formId/share"
							params={{ workspaceId, formId }}
						>
							<span className="text-sm font-medium text-foreground hover:underline cursor-pointer">Close</span>
						</Link>
					</div>

					<div className="p-6 pt-2 space-y-6">
						{/* Embed Type Selector */}
						<div className="space-y-3">
							<Select
								value={embedType}
								onValueChange={(v) => {
									setEmbedType(v as EmbedType);
									if (showCode) {
										navigate({
											search: (prev) => ({ ...prev, showCode: false }),
										});
									}
								}}
							>
								<SelectTrigger className="w-full h-10 bg-white border-muted-foreground/20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="standard">Standard</SelectItem>
									<SelectItem value="popup">Popup</SelectItem>
									<SelectItem value="fullpage">Full page</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Get Code Button */}
						<Button
							onClick={toggleCodeView}
							className={cn(
								"w-full h-10 gap-2 rounded-md font-medium transition-colors",
								showCode
									? "bg-white border border-gray-200 text-foreground hover:bg-gray-50"
									: "bg-black hover:bg-black/90 text-white"
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

						{/* Copy Link - Only show if not fullpage (handled in button) and not showing code */}
						{embedType !== "popup" && embedType !== "fullpage" && !showCode && (
							<Button
								variant="ghost"
								onClick={handleCopyLink}
								className="w-full h-10 gap-2 text-muted-foreground font-normal hover:bg-muted"
							>
								{copiedLink ? (
									<Check className="h-4 w-4" />
								) : (
									<Copy className="h-4 w-4" />
								)}
								{copiedLink ? "Copied!" : "Copy embed link"}
							</Button>
						)}

						{/* Options Section - Hide when showing code */}
						{!showCode && (
							<div className="space-y-5 pt-6 border-t border-muted">
								<div className="flex items-center justify-between">
									<h2 className="text-lg font-bold text-foreground">Options</h2>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
													<HelpCircle className="h-4 w-4" />
													<span>Help</span>
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>Configure how your form appears when embedded</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>

								{/* Standard Embed Options */}
								{embedType === "standard" && (
									<div className="space-y-6">
										{/* Height */}
										<div className="space-y-3">
											<Label className="text-sm font-medium">Height</Label>
											<div className="relative">
												<Input
													type="number"
													value={options.height}
													onChange={(e) =>
														updateOption("height", Number(e.target.value))
													}
													className="pr-12"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
													px
												</span>
											</div>
										</div>

										{/* Dynamic Height */}
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Label className="text-sm font-medium">
													Dynamic height
												</Label>
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
														</TooltipTrigger>
														<TooltipContent>
															<p>
																Automatically adjust iframe height to fit content
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</div>
											<Switch
												checked={options.dynamicHeight}
												onCheckedChange={(v) => updateOption("dynamicHeight", v)}
											/>
										</div>

										{/* Hide Form Title */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Hide form title
											</Label>
											<Switch
												checked={options.hideTitle}
												onCheckedChange={(v) => updateOption("hideTitle", v)}
											/>
										</div>

										{/* Align Content Left */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Align content to the left
											</Label>
											<Switch
												checked={options.alignLeft}
												onCheckedChange={(v) => updateOption("alignLeft", v)}
											/>
										</div>

										{/* Transparent Background */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Transparent background
											</Label>
											<Switch
												checked={options.transparentBackground}
												onCheckedChange={(v) =>
													updateOption("transparentBackground", v)
												}
											/>
										</div>
									</div>
								)}

								{/* Popup Embed Options */}
								{embedType === "popup" && (
									<div className="space-y-6">
										{/* Open Trigger */}
										<div className="space-y-3">
											<Label className="text-sm font-medium">Open</Label>
											<Select
												value={options.popupTrigger}
												onValueChange={(v) =>
													updateOption(
														"popupTrigger",
														v as typeof options.popupTrigger,
													)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="button">On button click</SelectItem>
													<SelectItem value="auto">Automatically</SelectItem>
													<SelectItem value="scroll">On scroll</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Position */}
										<div className="space-y-3">
											<Label className="text-sm font-medium">Position</Label>
											<Select
												value={options.popupPosition}
												onValueChange={(v) =>
													updateOption(
														"popupPosition",
														v as typeof options.popupPosition,
													)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="bottom-right">
														Bottom right corner
													</SelectItem>
													<SelectItem value="bottom-left">
														Bottom left corner
													</SelectItem>
													<SelectItem value="center">Center</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{/* Width */}
										<div className="space-y-3">
											<Label className="text-sm font-medium">Width</Label>
											<div className="relative">
												<Input
													type="number"
													value={options.popupWidth}
													onChange={(e) =>
														updateOption("popupWidth", Number(e.target.value))
													}
													className="pr-12"
												/>
												<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
													px
												</span>
											</div>
										</div>

										{/* Hide Form Title */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Hide form title
											</Label>
											<Switch
												checked={options.hideTitle}
												onCheckedChange={(v) => updateOption("hideTitle", v)}
											/>
										</div>

										{/* Align Content Left */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Align content to the left
											</Label>
											<Switch
												checked={options.alignLeft}
												onCheckedChange={(v) => updateOption("alignLeft", v)}
											/>
										</div>

										{/* Dark Overlay */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">Dark overlay</Label>
											<Switch
												checked={options.darkOverlay}
												onCheckedChange={(v) => updateOption("darkOverlay", v)}
											/>
										</div>

										{/* Emoji */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">Emoji</Label>
											<Switch
												checked={options.emoji}
												onCheckedChange={(v) => updateOption("emoji", v)}
											/>
										</div>

										{options.emoji && (
											<div className="space-y-3 pl-4 border-l-2 border-muted">
												<Input
													value={options.emojiIcon}
													onChange={(e) =>
														updateOption("emojiIcon", e.target.value)
													}
													className="text-lg"
												/>
												<Select
													value={options.emojiAnimation}
													onValueChange={(v) =>
														updateOption(
															"emojiAnimation",
															v as typeof options.emojiAnimation,
														)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="wave">Wave</SelectItem>
														<SelectItem value="bounce">Bounce</SelectItem>
														<SelectItem value="pulse">Pulse</SelectItem>
													</SelectContent>
												</Select>
											</div>
										)}

										{/* Hide on Submit */}
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Label className="text-sm font-medium">
														Hide on submit
													</Label>
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
															</TooltipTrigger>
															<TooltipContent>
																<p>Automatically close the popup after form submission</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												</div>
												<Switch
													checked={options.hideOnSubmit}
													onCheckedChange={(v) => updateOption("hideOnSubmit", v)}
												/>
											</div>

											{options.hideOnSubmit && (
												<div className="space-y-3 pl-4 border-l-2 border-muted">
													<div className="relative">
														<Input
															type="number"
															value={options.hideOnSubmitDelay}
															onChange={(e) =>
																updateOption("hideOnSubmitDelay", Number(e.target.value))
															}
															className="pr-24"
														/>
														<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
															seconds delay
														</span>
													</div>
												</div>
											)}
										</div>
									</div>
								)}

								{/* Full Page Options */}
								{embedType === "fullpage" && (
									<div className="space-y-6">
										{/* Transparent Background */}
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Transparent background
											</Label>
											<Switch
												checked={options.transparentBackground}
												onCheckedChange={(v) =>
													updateOption("transparentBackground", v)
												}
											/>
										</div>
									</div>
								)}

								{/* Common Options */}
								<div className="space-y-6 pt-4 border-t">
									{/* Track Form Events */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Label className="text-sm font-medium">
												Track form events
											</Label>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
													</TooltipTrigger>
													<TooltipContent>
														<p>Track form views and submissions with analytics</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<Switch
											checked={options.trackEvents}
											onCheckedChange={(v) => updateOption("trackEvents", v)}
										/>
									</div>

									{/* Custom Domain - Pro */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Label className="text-sm font-medium">Custom domain</Label>
											<Badge
												variant="secondary"
												className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-700"
											>
												Pro
											</Badge>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
													</TooltipTrigger>
													<TooltipContent>
														<p>Use your own domain for the form URL</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<Switch
											checked={options.customDomain}
											onCheckedChange={(v) => updateOption("customDomain", v)}
											disabled
										/>
									</div>

									{/* Branding - Pro */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Label className="text-sm font-medium text-foreground">
												Better Forms branding
											</Label>
											<Badge
												variant="secondary"
												className="text-[10px] h-4 px-1.5 bg-[#FDF2F8] text-[#BE185D] border-[#FCE7F3]"
											>
												Pro
											</Badge>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
													</TooltipTrigger>
													<TooltipContent>
														<p>Remove Better Forms branding from your form</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<Switch
											checked={options.branding}
											onCheckedChange={(v) => updateOption("branding", v)}
										/>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Right Side - Preview or Instructions */}
				<div className={cn("flex-1 overflow-y-auto", showCode ? "bg-[#25282F]" : "bg-[#F9FAFB]")}>
					{showCode ? (
						<EmbedInstructions
							embedType={embedType}
							options={options}
							embedCode={embedCode}
							formId={formId}
						/>
					) : (
						<div className="p-12">
							<h2 className="text-2xl font-bold text-foreground mb-8">Preview</h2>

							{/* Preview Container */}
							<div className="relative">
								{/* Standard & Popup - Show mock website background */}
								{embedType !== "fullpage" && (
									<div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-200/60 overflow-hidden min-h-[600px] flex flex-col">
										{/* Mock Website Placeholder Rendering */}
										<div className="flex-1 p-8 space-y-8 relative">
											{/* Mock Header Bars */}
											<div className="flex gap-4">
												<div className="w-32 h-6 bg-gray-100 rounded-sm" />
												<div className="flex-1" />
												<div className="w-16 h-3 bg-gray-50 rounded-full mt-1.5" />
												<div className="w-16 h-3 bg-gray-50 rounded-full mt-1.5" />
											</div>

											{/* Top Bar */}
											<div className="w-full h-8 bg-gray-50 rounded-sm" />

											{/* Content Area */}
											<div className="grid grid-cols-12 gap-8 pt-4">
												<div className="col-span-4 space-y-4">
													<div className="w-full h-32 bg-gray-50 rounded-lg" />
													<div className="w-full h-48 bg-gray-[rgba(249,250,251,0.5)] rounded-lg" />
												</div>
												<div className="col-span-8 space-y-6 relative">
													{/* Mock Content Container - No fixed height, let it grow */}
													<div className="w-full min-h-[400px] flex flex-col relative">
														{/* Dark Overlay Preview */}
														{embedType === "popup" && options.darkOverlay && (
															<div className="absolute inset-0 bg-black/40 z-0 transition-opacity duration-300 pointer-events-none rounded-xl" />
														)}

														{/* Floating Popup Form Mock */}
														{embedType === "popup" && (
															<div
																className={cn(
																	"absolute bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border overflow-hidden flex flex-col transition-all duration-300 z-10",
																	options.popupPosition === "center"
																		? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
																		: options.popupPosition === "bottom-left"
																			? "bottom-6 left-6"
																			: "bottom-6 right-6",
																)}
																style={{ width: options.popupWidth }}
															>
																{/* Popup Header */}
																<div className="flex items-center gap-4 p-6 pb-2 shrink-0">
																	{options.emoji && (
																		<div className="relative">
																			<span className={cn(
																				"text-3xl inline-block",
																				options.emojiAnimation === "wave" && "animate-wave",
																				options.emojiAnimation === "bounce" && "animate-bounce",
																				options.emojiAnimation === "pulse" && "animate-scale-pulse"
																			)}>
																				{options.emojiIcon}
																			</span>
																			<style>
																				{`
																				@keyframes wave {
																					0% { transform: rotate(0deg); }
																					10% { transform: rotate(14deg); }
																					20% { transform: rotate(-8deg); }
																					30% { transform: rotate(14deg); }
																					40% { transform: rotate(-4deg); }
																					50% { transform: rotate(10deg); }
																					60% { transform: rotate(0deg); }
																					100% { transform: rotate(0deg); }
																				}
																				@keyframes scale-pulse {
																					0% { transform: scale(1); }
																					50% { transform: scale(1.15); }
																					100% { transform: scale(1); }
																				}
																				.animate-wave {
																					animation: wave 2.5s infinite;
																					transform-origin: 70% 70%;
																				}
																				.animate-scale-pulse {
																					animation: scale-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
																				}
																			`}
																			</style>
																		</div>
																	)}
																	<h3 className="font-extrabold text-xl text-foreground truncate flex-1">
																		{options.hideTitle ? "" : doc.title}
																	</h3>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 -mr-2 hover:bg-muted text-muted-foreground/50 rounded-full"
																	>
																		<X className="h-4 w-4" />
																	</Button>
																</div>

																{/* Popup Content */}
																<div className="px-6 py-2 overflow-y-auto max-h-[400px]">
																	<FormPreviewFromPlate
																		content={doc.content as Value}
																		title=""
																		icon={undefined}
																		cover={undefined}
																		onSubmit={async () => { }}
																	/>
																</div>

																{/* Integrated Branding at Bottom - Full Width Bar */}
																{options.branding && (
																	<div className="py-3 flex justify-center bg-[#EBF5FF] border-t mt-4">
																		<div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0066CC]">
																			<span>Made with</span>
																			<Sparkles className="h-3 w-3 fill-[#0066CC] text-[#0066CC]" />
																			<span>Better Forms</span>
																		</div>
																	</div>
																)}
															</div>
														)}

														{/* Standard Embed Mock - Seamless integration, no card */}
														{embedType === "standard" && (
															<div
																className={cn(
																	"w-full transition-all duration-300",
																	options.transparentBackground ? "bg-transparent" : "bg-white",
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
																	onSubmit={async () => { }}
																/>
															</div>
														)}
													</div>

													{/* Global Branding Pill for Standard Embed - Positioned after form */}
													{embedType === "standard" && options.branding && (
														<div className="flex justify-end mt-6">
															<div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF5FF] border border-[#EBF5FF] rounded-full text-[11px] font-bold text-[#0066CC] hover:scale-105 transition-transform cursor-default">
																<span>Made with</span>
																<Sparkles className="h-3.5 w-3.5 fill-[#0066CC] text-[#0066CC]" />
																<span>Better Forms</span>
															</div>
														</div>
													)}

													<div className="w-full h-24 bg-gray-50/50 rounded-lg mt-8" />
												</div>
											</div>
										</div>
									</div>
								)}

								{/* Full Page - Clean direct form display */}
								{embedType === "fullpage" && (
									<div
										className={cn(
											"min-h-[700px] transition-all duration-300",
											options.transparentBackground ? "bg-transparent" : "bg-white",
										)}
									>
										<div className="py-20 px-10 max-w-2xl mx-auto">
											<FormPreviewFromPlate
												content={doc.content as Value}
												title={options.hideTitle ? "" : doc.title}
												icon={doc.icon ?? undefined}
												cover={doc.cover ?? undefined}
												onSubmit={async () => { }}
											/>

											{/* Integrated Branding for Full Page */}
											{options.branding && (
												<div className="mt-20 flex justify-center">
													<div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EBF5FF] border border-[#EBF5FF] rounded-full text-[11px] font-bold text-[#0066CC] hover:scale-105 transition-transform cursor-default">
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
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function EmbedInstructions({
	embedType,
	options,
	embedCode,
	formId,
}: {
	embedType: EmbedType;
	options: EmbedOptions;
	embedCode: string;
	formId: string;
}) {
	const [sections, setSections] = useState<Record<string, boolean>>({
		save: false,
		js: false,
	});

	const toggleSection = (section: string) => {
		setSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const CopyButton = ({ text }: { text: string }) => {
		const [copied, setCopied] = useState(false);
		const handleCopy = () => {
			navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		};
		return (
			<button
				onClick={handleCopy}
				className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
			>
				{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
			</button>
		);
	};

	const CodeBlock = ({ code }: { code: string }) => (
		<div className="relative group mt-3">
			<pre className="bg-[#1A1D23] border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed">
				<code>{code}</code>
			</pre>
			<CopyButton text={code} />
		</div>
	);

	return (
		<div className="p-12 max-w-4xl mx-auto">
			<h2 className="text-2xl font-bold text-white mb-2">
				Add the {embedType === "popup" ? "popup" : "form"} to your website
			</h2>
			<p className="text-gray-400 mb-8 max-w-2xl">
				{embedType === "popup"
					? `To open a Better Forms popup, paste the following code snippet in the <head> section of your website.`
					: "Copy and paste the code below into your website HTML where you want the form to appear."}
			</p>

			<div className="space-y-8">
				{embedType === "standard" ? (
					<div>
						<CodeBlock code={embedCode} />
					</div>
				) : (
					/* Popup Instructions */
					<>
						<div>
							<CodeBlock
								code={`<script async src="${window.location.origin}/embed/popup.js"></script>`}
							/>
						</div>

						<div>
							<p className="text-gray-300 mt-8 mb-4 leading-relaxed">
								Then to <strong className="text-white">open the popup on clicking a button</strong>, you need to add the following <span className="text-white font-mono bg-gray-800 px-1 py-0.5 rounded">data-form-id</span> attributes to an existing button on your page. You can add these attributes to any clickable element - button, div, etc.
							</p>
							<div className="bg-[#2D3139] border-l-4 border-blue-500 rounded-r-lg p-4 mb-4">
								<p className="text-sm text-gray-300">
									<span className="text-gray-500 font-mono">// Data attributes</span>
									<br />
									<span className="font-mono break-all text-blue-300">
										data-form-id="{formId}" data-popup-width="{options.popupWidth}" {options.emoji ? `data-emoji="${options.emojiIcon}"` : ""}
									</span>
								</p>
							</div>
							<CodeBlock
								code={`// Example
<button data-form-id="${formId}" data-popup-width="${options.popupWidth}"${options.emoji ? ` data-emoji="${options.emojiIcon}"` : ""}>
  Open Form
</button>`}
							/>
						</div>

						<div>
							<p className="text-gray-300 mt-8 mb-4">
								Alternatively, you can <strong className="text-white">open the popup by clicking on a link</strong> with a custom URL hash. Add the URL below to a link on your page to open the popup.
							</p>
							<CodeBlock
								code={`// Example
<a href="#form-open=${formId}&popup-width=${options.popupWidth}${options.emoji ? `&emoji=${encodeURIComponent(options.emojiIcon)}` : ""}">
  Open Popup
</a>`}
							/>
						</div>
					</>
				)}

				{/* Documentation Accordions */}
				<div className="pt-8 border-t border-gray-800 space-y-2">
					<div className="border-b border-gray-800">
						<button
							onClick={() => toggleSection('save')}
							className="w-full flex items-center justify-between py-4 text-left text-lg font-semibold text-white hover:text-gray-200"
						>
							Save website page and query parameters
							<ChevronDown className={cn("w-5 h-5 transition-transform", sections.save && "rotate-180")} />
						</button>
						{sections.save && (
							<div className="pb-4 text-gray-400">
								<p>Your form automatically captures URL query parameters and can save them as hidden fields.</p>
							</div>
						)}
					</div>

					<div className="border-b border-gray-800">
						<button
							onClick={() => toggleSection('js')}
							className="w-full flex items-center justify-between py-4 text-left text-lg font-semibold text-white hover:text-gray-200"
						>
							Use JavaScript
							<ChevronDown className={cn("w-5 h-5 transition-transform", sections.js && "rotate-180")} />
						</button>
						{sections.js && (
							<div className="pb-4 text-gray-400">
								<p>You can use the JavaScript API to open, close, and manipulate the form programmatically.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
