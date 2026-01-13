import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Copy,
	FileText,
	HelpCircle,
	LayoutGrid,
	Loader2,
	MoveRight,
	Pencil,
	Plus,
	Search,
	Settings,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type EditorDoc,
	editorDocCollection,
	workspaceCollection,
} from "@/db-collections";
import { createForm, deleteForm, duplicateForm, moveFormToWorkspace } from "@/services/form.service";
import { useWorkspaces } from "@/hooks/use-workspace-init";

const FORMS_PER_PAGE = 10;

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/",
)({
	component: WorkspaceDashboard,
	ssr: false,
});

function WorkspaceDashboard() {
	const navigate = useNavigate();
	const { workspaceId } = Route.useParams();
	const [isCreating, setIsCreating] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [formToDelete, setFormToDelete] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	const workspaces = useWorkspaces();

	// Query workspace details
	const { data: workspaceData } = useLiveQuery((q) =>
		q
			.from({ workspace: workspaceCollection })
			.where(({ workspace }) => eq(workspace.id, workspaceId))
			.select(({ workspace }) => ({
				id: workspace.id,
				name: workspace.name,
			})),
	);
	const workspace = workspaceData?.[0];

	// Query forms for this workspace
	const { data: forms = [] } = useLiveQuery((q) =>
		q
			.from({ doc: editorDocCollection })
			.where(({ doc }) => eq(doc.workspaceId, workspaceId))
			.select(({ doc }) => ({
				id: doc.id,
				workspaceId: doc.workspaceId,
				title: doc.title,
				updatedAt: doc.updatedAt,
				content: doc.content,
				settings: doc.settings,
				formName: doc.formName,
				schemaName: doc.schemaName,
				isMS: doc.isMS,
				isPreview: doc.isPreview,
				icon: doc.icon,
				cover: doc.cover,
			})),
	);

	// Sort by updatedAt descending (most recent first)
	const sortedForms = [...forms].sort((a, b) => b.updatedAt - a.updatedAt);

	// Pagination
	const totalPages = Math.ceil(sortedForms.length / FORMS_PER_PAGE);
	const startIndex = (currentPage - 1) * FORMS_PER_PAGE;
	const paginatedForms = sortedForms.slice(
		startIndex,
		startIndex + FORMS_PER_PAGE,
	);

	const handleCreateForm = async () => {
		setIsCreating(true);
		try {
			const newForm = await createForm(workspaceId, "Untitled");
			navigate({
				to: "/workspace/$workspaceId/form-builder/$formId",
				params: { workspaceId, formId: newForm.id },
			});
		} catch (error) {
			console.error("Failed to create form:", error);
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteClick = (form: { id: string; title: string }) => {
		setFormToDelete(form);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (formToDelete) {
			await deleteForm(formToDelete.id);
			setDeleteDialogOpen(false);
			setFormToDelete(null);
		}
	};

	const handleDuplicate = async (form: EditorDoc) => {
		try {
			await duplicateForm(form);
		} catch (error) {
			console.error("Failed to duplicate form:", error);
		}
	};

	const handleMoveForm = async (formId: string, targetWorkspaceId: string) => {
		try {
			await moveFormToWorkspace(formId, targetWorkspaceId);
		} catch (error) {
			console.error("Failed to move form:", error);
		}
	};

	const formatLastEdited = (timestamp: number) => {
		return `Edited ${formatDistanceToNow(timestamp)} ago`;
	};

	if (!workspace) {
		return (
			<div className="flex-1 flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h2 className="text-lg font-medium mb-2">Workspace Not Found</h2>
					<p className="text-sm text-muted-foreground mb-4">
						This workspace does not exist or has been deleted.
					</p>
					<Link to="/dashboard">
						<Button>Back to Dashboard</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col min-h-screen bg-background">
			{/* Dashboard Header */}
			<header className="h-12 border-b flex items-center justify-between px-6 shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground mr-1">*</span>
					<span className="text-muted-foreground">/</span>
					<span className="text-sm font-medium">{workspace.name}</span>
				</div>
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-2 text-muted-foreground"
					>
						<Search className="h-4 w-4" />
						<span>Search</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground"
					>
						<LayoutGrid className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground"
					>
						<Settings className="h-4 w-4" />
					</Button>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 p-12 max-w-5xl mx-auto w-full space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="text-4xl font-bold tracking-tight">{workspace.name}</h1>
					<div className="flex items-center gap-3">
						<Button
							size="sm"
							className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
							onClick={handleCreateForm}
							disabled={isCreating}
						>
							{isCreating ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							New form
						</Button>
					</div>
				</div>

				{/* Forms List */}
				<div className="space-y-4 pt-4">
					<div className="grid grid-cols-1 gap-1">
						{paginatedForms.map((form) => (
							<div
								key={form.id}
								className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
								onClick={() =>
									navigate({
										to: "/workspace/$workspaceId/form-builder/$formId",
										params: { workspaceId, formId: form.id },
									})
								}
							>
								<div className="flex items-center gap-4">
									<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
										<FileText className="h-5 w-5 text-muted-foreground" />
									</div>
									<div className="flex flex-col">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{form.title || "Untitled"}
											</span>
											<Badge
												variant="secondary"
												className="text-[10px] h-4 px-1.5 font-normal bg-muted text-muted-foreground"
											>
												Draft
											</Badge>
										</div>
										<span className="text-xs text-muted-foreground">
											{formatLastEdited(form.updatedAt)}
										</span>
									</div>
								</div>

								<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={(e) => {
														e.stopPropagation();
														// Rename logic to be implemented
													}}
												>
													<Pencil className="h-4 w-4 text-muted-foreground" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Rename</TooltipContent>
										</Tooltip>

										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={(e) => {
														e.stopPropagation();
														handleDuplicate(form as EditorDoc);
													}}
												>
													<Copy className="h-4 w-4 text-muted-foreground" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Duplicate</TooltipContent>
										</Tooltip>

										{/* Move to workspace dropdown */}
										{workspaces.length > 1 && (
											<DropdownMenu>
												<Tooltip>
													<TooltipTrigger asChild>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8"
																onClick={(e) => e.stopPropagation()}
															>
																<MoveRight className="h-4 w-4 text-muted-foreground" />
															</Button>
														</DropdownMenuTrigger>
													</TooltipTrigger>
													<TooltipContent>Move to workspace</TooltipContent>
												</Tooltip>
												<DropdownMenuContent
													align="end"
													onClick={(e) => e.stopPropagation()}
												>
													{workspaces
														.filter((w) => w.id !== workspaceId)
														.map((w) => (
															<DropdownMenuItem
																key={w.id}
																onClick={() => handleMoveForm(form.id, w.id)}
															>
																{w.name}
															</DropdownMenuItem>
														))}
												</DropdownMenuContent>
											</DropdownMenu>
										)}

										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 hover:bg-destructive/80 hover:text-destructive"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteClick({
															id: form.id,
															title: form.title || "Untitled",
														});
													}}
												>
													<Trash2 className="h-4 w-4 text-muted-foreground hover:text-white" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Delete</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
							</div>
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Showing {startIndex + 1}-
								{Math.min(startIndex + FORMS_PER_PAGE, sortedForms.length)} of{" "}
								{sortedForms.length} forms
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" />
									Previous
								</Button>
								<div className="flex items-center gap-1">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map(
										(page) => (
											<Button
												key={page}
												variant={currentPage === page ? "default" : "ghost"}
												size="sm"
												className="h-8 w-8 p-0"
												onClick={() => setCurrentPage(page)}
											>
												{page}
											</Button>
										),
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									disabled={currentPage === totalPages}
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}

					{sortedForms.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-2xl bg-muted/20">
							<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
								<FileText className="h-6 w-6 text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<p className="font-medium">No forms yet</p>
								<p className="text-sm text-muted-foreground max-w-xs">
									Create your first form in this workspace.
								</p>
							</div>
							<Button
								size="sm"
								onClick={handleCreateForm}
								disabled={isCreating}
							>
								{isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
								Create my first form
							</Button>
						</div>
					)}
				</div>
			</main>

			{/* Help Circle */}
			<div className="fixed bottom-6 right-6">
				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted shadow-sm border"
				>
					<HelpCircle className="h-5 w-5 text-muted-foreground" />
				</Button>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete form</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{formToDelete?.title}"? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
