import { format } from "date-fns";
import { HelpCircle, Loader2, Lock, X } from "lucide-react";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { useState } from "react";
import { toast } from "sonner";
import { EditorKit } from "@/components/editor/editor-kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useFormVersionContent,
	useFormVersions,
	useRestoreVersion,
} from "@/hooks/use-form-versions";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface VersionHistoryDialogProps {
	formId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Separate component that remounts when content changes
function VersionPreviewEditor({ content }: { content: Value }) {
	const editor = usePlateEditor({
		plugins: EditorKit,
		value: content,
	});

	return (
		<Plate editor={editor} readOnly={true}>
			<EditorContainer
				variant="default"
				className="overflow-visible px-0! max-w-none! border-none shadow-none"
			>
				<Editor className="overflow-x-visible px-0!" />
			</EditorContainer>
		</Plate>
	);
}

export function VersionHistoryDialog({
	formId,
	open,
	onOpenChange,
}: VersionHistoryDialogProps) {
	const { data: versionsData } = useFormVersions(formId);
	// Track user's explicit selection (null = use default)
	const [userSelectedVersionId, setUserSelectedVersionId] = useState<
		string | null
	>(null);

	const versions = versionsData?.versions ?? [];
	// Derive selected version: user selection or first version (no useEffect needed)
	const selectedVersionId = userSelectedVersionId ?? versions[0]?.id ?? null;

	const { data: versionContent, isLoading: isLoadingContent } =
		useFormVersionContent(selectedVersionId ?? undefined);
	const restoreMutation = useRestoreVersion();
	const { data: sessionData } = useSession();
	const currentUser = sessionData?.user;

	// Get the latest version (first in the list since they're ordered by desc version)
	const latestVersion = versions[0];

	const handleSelectVersion = (versionId: string) => {
		setUserSelectedVersionId(versionId);
	};

	const handleRestore = async () => {
		if (!selectedVersionId) return;

		try {
			await restoreMutation.mutateAsync({
				formId,
				versionId: selectedVersionId,
			});
			toast.success("Version restored. Publish again to make it live.");
			onOpenChange(false);
		} catch {
			toast.error("Failed to restore version");
		}
	};

	// Format time for display (e.g., "03:44 PM")
	const formatTime = (dateString: string) => {
		return format(new Date(dateString), "hh:mm a");
	};

	// Format date for display (e.g., "Jan 21, 12:49 PM")
	const formatDateTime = (dateString: string) => {
		return format(new Date(dateString), "MMM d, h:mm a");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-[1200px] w-[95vw] sm:h-[90vh] h-[95vh] m-0 p-0 flex flex-col gap-0 overflow-hidden border rounded-xl shadow-2xl"
			>
				<div className="flex flex-1 h-full w-full overflow-hidden">
					{/* Left Section: Editor Preview */}
					<div className="flex-1 flex flex-col bg-background overflow-hidden border-r">
						<header className="h-14 border-b flex items-center px-4 shrink-0 justify-center">
							<span className="text-sm font-medium text-muted-foreground">
								{versionContent?.version?.publishedAt ? (
									<>
										Previewing version from{" "}
										<span className="text-foreground font-semibold">
											{formatDateTime(versionContent.version.publishedAt)}
										</span>
									</>
								) : (
									"Previewing version..."
								)}
							</span>
						</header>

						<div className="flex-1 overflow-auto bg-background">
							<div className="mx-auto w-full max-w-[850px] min-h-full pb-20">
								{isLoadingContent || !versionContent?.version?.content ? (
									<div className="flex items-center justify-center p-20">
										<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
									</div>
								) : (
									<VersionPreviewEditor
										key={selectedVersionId}
										content={versionContent.version.content as Value}
									/>
								)}
							</div>
						</div>
					</div>

					{/* Right Section: Version History Sidebar */}
					<div className="w-[320px] flex flex-col bg-background shrink-0">
						{/* Sidebar Header */}
						<div className="px-4 h-14 border-b flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold">Version history</span>
								<HelpCircle className="h-4 w-4 text-muted-foreground" />
							</div>
							<DialogClose asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<X className="h-4 w-4" />
								</Button>
							</DialogClose>
						</div>

						{/* Current Version */}
						<div className="px-4 py-3 shrink-0">
							<div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
								Current version
							</div>
							<div className="flex items-center gap-3 p-2 rounded-md bg-muted/50 border">
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={currentUser?.image ?? undefined}
										alt={currentUser?.name}
									/>
									<AvatarFallback className="text-xs">
										{currentUser?.name?.charAt(0) ?? "?"}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col">
									<span className="text-sm font-medium">
										{currentUser?.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{formatTime(new Date().toISOString())}
									</span>
								</div>
							</div>
						</div>

						{/* Version List */}
						<ScrollArea className="flex-1">
							<div className="py-2">
								<div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
									{versions.length} autosave version
									{versions.length !== 1 ? "s" : ""}
								</div>

								<div className="space-y-1 px-2">
									{versions.map((version, index) => (
										<button
											key={version.id}
											type="button"
											onClick={() => handleSelectVersion(version.id)}
											className={cn(
												"w-full px-3 py-3 text-left rounded-md transition-colors group",
												selectedVersionId === version.id
													? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
													: "hover:bg-muted",
											)}
										>
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium">
													{index === 0
														? formatTime(version.publishedAt)
														: formatDateTime(version.publishedAt)}
												</span>
												{version.id === latestVersion?.id && (
													<Lock className="h-3.5 w-3.5 text-muted-foreground" />
												)}
											</div>
											<div className="flex items-center gap-2 mt-1.5">
												<Avatar className="h-5 w-5">
													<AvatarImage
														src={version.publishedBy.image ?? undefined}
													/>
													<AvatarFallback className="text-[10px]">
														{version.publishedBy.name?.charAt(0) ?? "?"}
													</AvatarFallback>
												</Avatar>
												<span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
													{version.publishedBy.name}
												</span>
											</div>
										</button>
									))}
								</div>
							</div>
						</ScrollArea>

						{/* Restore Action */}
						<div className="p-4 border-t bg-muted/5 mt-auto">
							<Button
								onClick={handleRestore}
								disabled={!selectedVersionId || restoreMutation.isPending}
								className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
								size="lg"
							>
								{restoreMutation.isPending ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : null}
								Restore
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
