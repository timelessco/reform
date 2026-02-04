import { ImageIcon, Settings, Smile, Upload, X } from "lucide-react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef } from "platejs/react";
import AvatarUpload from "@/components/file-upload/avatar-upload";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomizeSidebar } from "@/hooks/use-customize-sidebar";
import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

export interface FormHeaderElementData {
	type: "formHeader";
	id?: string;
	title: string;
	icon: string | null;
	cover: string | null;
	children: [{ text: "" }];
}

export function createFormHeaderNode(
	data: Partial<Omit<FormHeaderElementData, "type" | "children">> = {},
): FormHeaderElementData {
	return {
		type: "formHeader",
		title: data.title ?? "",
		icon: data.icon ?? null,
		cover: data.cover ?? null,
		children: [{ text: "" }],
	};
}

function CoverUpload({
	onFileChange,
}: {
	onFileChange: (url: string) => void;
}) {
	const [
		{ isDragging, errors },
		{
			handleDragEnter,
			handleDragLeave,
			handleDragOver,
			handleDrop,
			openFileDialog,
			getInputProps,
		},
	] = useFileUpload({
		maxFiles: 1,
		maxSize: 5 * 1024 * 1024,
		accept: "image/*",
		multiple: false,
		onFilesChange: (files) => {
			if (files[0]?.preview) {
				onFileChange(files[0].preview);
			}
		},
	});

	return (
		<div className="flex flex-col gap-4">
			<button
				className={cn(
					"group/cover-upload relative h-32 w-full cursor-pointer overflow-hidden rounded-md border-2 border-dashed transition-colors flex items-center justify-center",
					isDragging
						? "border-primary bg-primary/5"
						: "border-muted-foreground/25 hover:border-muted-foreground/20 hover:bg-muted/50",
				)}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onClick={openFileDialog}
				type="button"
			>
				<input {...getInputProps()} className="sr-only" />
				<div className="flex flex-col items-center gap-2 text-muted-foreground">
					<Upload className="h-8 w-8" />
					<span className="text-sm font-medium">Upload cover image</span>
					<span className="text-xs">Max 5MB</span>
				</div>
			</button>
			{errors.length > 0 && (
				<div className="text-destructive text-sm">{errors[0]}</div>
			)}
		</div>
	);
}

export function FormHeaderElement(props: PlateElementProps) {
	const { element, children } = props;
	const editor = useEditorRef();
	const { toggle: toggleCustomize } = useCustomizeSidebar();

	const title = (element.title as string) || "";
	const icon = (element.icon as string | null) || null;
	const cover = (element.cover as string | null) || null;

	const hasCover = !!cover;
	const hasLogo = !!icon;

	const updateHeader = (updates: Partial<FormHeaderElementData>) => {
		const path = editor.api.findPath(element);
		if (path) {
			editor.tf.setNodes(updates, { at: path });
		}
	};

	const handleTitleChange = (newTitle: string) => {
		updateHeader({ title: newTitle });
	};

	const handleIconChange = (newIcon: string | null) => {
		updateHeader({ icon: newIcon });
	};

	const handleCoverChange = (newCover: string | null) => {
		updateHeader({ cover: newCover });
	};

	const handleAddCover = () => handleCoverChange("#FFE4E1");
	const handleAddIcon = () => handleIconChange("default-icon");

	return (
		<PlateElement {...props}>
			<div
				contentEditable={false}
				className="group relative w-full flex flex-col mb-4 select-none"
			>
				{hasCover && (
					<div className="relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[120px] sm:h-[200px] group/cover bg-muted/20">
						{cover && !cover.startsWith("#") ? (
							<img
								src={cover}
								alt="Cover"
								className="w-full h-full object-cover"
							/>
						) : (
							<div
								className="w-full h-full"
								style={{
									backgroundColor: cover?.startsWith("#") ? cover : "#FFE4E1",
								}}
							/>
						)}

						<div className="absolute bottom-2 right-2 opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-2">
							<Dialog>
								<DialogTrigger asChild>
									<Button
										variant="secondary"
										size="sm"
										className="bg-white/80 hover:bg-white text-xs h-7"
										onMouseDown={(e) => e.preventDefault()}
									>
										Change cover
									</Button>
								</DialogTrigger>
								<DialogContent className="sm:max-w-md">
									<DialogHeader>
										<DialogTitle>Cover Image</DialogTitle>
									</DialogHeader>
									<Tabs defaultValue="gallery" className="w-full">
										<TabsList className="grid w-full grid-cols-2">
											<TabsTrigger value="gallery">Gallery</TabsTrigger>
											<TabsTrigger value="upload">Upload</TabsTrigger>
										</TabsList>
										<TabsContent
											value="gallery"
											className="grid grid-cols-4 gap-2 pt-4"
										>
											<button
												type="button"
												onClick={() => handleCoverChange("#FFE4E1")}
												className="h-16 bg-[#FFE4E1] rounded cursor-pointer hover:ring-2 ring-primary transition-all"
												aria-label="Pink color"
											/>
											<button
												type="button"
												onClick={() =>
													handleCoverChange(
														"https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
													)
												}
												className="h-16 bg-blue-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
												aria-label="Blue gradient"
											>
												<img
													src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"
													alt="Blue gradient"
													className="w-full h-full object-cover"
												/>
											</button>
											<button
												type="button"
												onClick={() =>
													handleCoverChange(
														"https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80",
													)
												}
												className="h-16 bg-purple-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
												aria-label="Purple gradient"
											>
												<img
													src="https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"
													alt="Purple gradient"
													className="w-full h-full object-cover"
												/>
											</button>
											<button
												type="button"
												onClick={() =>
													handleCoverChange(
														"https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
													)
												}
												className="h-16 bg-green-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
												aria-label="Green gradient"
											>
												<img
													src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80"
													alt="Green gradient"
													className="w-full h-full object-cover"
												/>
											</button>

											<button
												type="button"
												onClick={() => handleCoverChange(null)}
												onMouseDown={(e) => e.preventDefault()}
												className="col-span-4 mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
											>
												<X className="h-4 w-4" /> Remove cover
											</button>
										</TabsContent>
										<TabsContent value="upload" className="pt-4">
											<CoverUpload onFileChange={handleCoverChange} />
											<button
												type="button"
												onClick={() => handleCoverChange(null)}
												onMouseDown={(e) => e.preventDefault()}
												className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
											>
												<X className="h-4 w-4" /> Remove cover
											</button>
										</TabsContent>
									</Tabs>
								</DialogContent>
							</Dialog>

							<Button
								variant="secondary"
								size="sm"
								className="bg-white/80 hover:bg-white text-xs h-7 text-muted-foreground hover:text-destructive"
								onClick={() => handleCoverChange(null)}
								onMouseDown={(e) => e.preventDefault()}
							>
								Remove
							</Button>
						</div>
					</div>
				)}

				<div
					className={cn("relative max-w-[900px] mx-auto w-full flex flex-col")}
				>
					<div className="w-full sm:px-[max(10px,calc(50%-350px))]">
						{hasLogo && (
							<div
								className={cn(
									"relative z-10 mb-4",
									hasCover ? "-mt-[30px] sm:-mt-[40px]" : "mt-6 sm:mt-8",
								)}
							>
								<Dialog>
									<DialogTrigger asChild>
										<button
											type="button"
											className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-full overflow-hidden shadow-sm bg-background cursor-pointer hover:ring-2 hover:ring-muted-foreground/20 transition-all group/logo"
											onMouseDown={(e) => e.preventDefault()}
										>
											{icon && icon !== "default-icon" ? (
												<img
													src={icon}
													alt="Logo"
													className="w-full h-full object-cover"
												/>
											) : (
												<div className="w-full h-full bg-black flex items-center justify-center text-white">
													<svg
														className="w-6 h-6 sm:w-10 sm:h-10"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
														aria-hidden="true"
													>
														<title>Default icon</title>
														<path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
													</svg>
												</div>
											)}
										</button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Choose an icon</DialogTitle>
										</DialogHeader>
										<Tabs defaultValue="emoji" className="w-full">
											<TabsList className="grid w-full grid-cols-2">
												<TabsTrigger value="emoji">Emoji</TabsTrigger>
												<TabsTrigger value="upload">Upload</TabsTrigger>
											</TabsList>
											<TabsContent
												value="emoji"
												className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-4"
											>
												<span className="text-sm">
													Emoji picker placeholder
												</span>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleIconChange(null)}
													onMouseDown={(e) => e.preventDefault()}
													className="text-destructive hover:text-destructive"
												>
													<X className="mr-2 h-4 w-4" /> Remove icon
												</Button>
											</TabsContent>
											<TabsContent
												value="upload"
												className="pt-4 flex flex-col items-center"
											>
												<AvatarUpload
													onFileChange={(file) => {
														if (file?.preview) handleIconChange(file.preview);
													}}
												/>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleIconChange(null)}
													onMouseDown={(e) => e.preventDefault()}
													className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
												>
													Remove icon
												</Button>
											</TabsContent>
										</Tabs>
									</DialogContent>
								</Dialog>
							</div>
						)}

						<div
							className={cn(
								"flex gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
								!hasCover && !hasLogo && "mt-8 sm:mt-12",
								hasCover && !hasLogo && "mt-4",
								!hasCover && hasLogo && "mt-0",
							)}
						>
							{!hasLogo && (
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
									onClick={handleAddIcon}
									onMouseDown={(e) => e.preventDefault()}
								>
									<Smile className="mr-1.5 h-3.5 w-3.5" />
									Add icon
								</Button>
							)}
							{!hasCover && (
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
									onClick={handleAddCover}
									onMouseDown={(e) => e.preventDefault()}
								>
									<ImageIcon className="mr-1.5 h-3.5 w-3.5" />
									Add cover
								</Button>
							)}
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
								onClick={toggleCustomize}
								onMouseDown={(e) => e.preventDefault()}
							>
								<Settings className="mr-1.5 h-3.5 w-3.5" />
								Customize
							</Button>
						</div>

						<div className="relative group/title">
							<input
								type="text"
								placeholder="Form title"
								value={title}
								onChange={(e) => handleTitleChange(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										// Check if onboarding content is present (by type)
										const secondBlock = editor.children[1] as any;
										const isOnboarding =
											secondBlock?.type === "onboardingContent";

										if (isOnboarding) {
											// Clear to empty state: header + empty paragraph + submit button
											const currentHeader = editor.children[0];
											const emptyContent = [
												currentHeader,
												{ type: "p", children: [{ text: "" }] },
												createFormButtonNode("submit"),
											];
											editor.tf.init({
												value: emptyContent as any,
											});
											// Move cursor to first paragraph
											const firstBlockPath = [1];
											const startPoint = (editor.api as any).edges(
												firstBlockPath,
											)?.[0];
											if (startPoint) {
												editor.tf.select(startPoint);
												editor.tf.focus();
											}
										} else {
											// Normal behavior: move focus to first block
											const firstBlockPath = [1];
											const startPoint = (editor.api as any).edges(
												firstBlockPath,
											)?.[0];
											if (startPoint) {
												editor.tf.select(startPoint);
												editor.tf.focus();
											}
										}
									}
								}}
								onMouseDown={(e) => e.stopPropagation()}
								className="w-full text-2xl sm:text-4xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/50 py-1 sm:py-2 h-auto select-text"
							/>
						</div>
					</div>
				</div>
			</div>
			{children}
		</PlateElement>
	);
}
