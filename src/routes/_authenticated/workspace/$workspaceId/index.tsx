import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Copy,
	FileText,
	HelpCircle,
	Loader2,
	Trash2,
} from "lucide-react";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { WorkspaceHeader } from "@/components/ui/form-header";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	createWorkspaceLocal,
	deleteWorkspaceLocal,
	updateFormStatus,
	updateWorkspaceName,
} from "@/db-collections";
import { useFormsForWorkspace, useWorkspace } from "@/hooks/use-live-hooks";
import { createForm, duplicateForm } from "@/lib/fn/forms";

const FORMS_PER_PAGE = 10;

export const Route = createFileRoute("/_authenticated/workspace/$workspaceId/")(
	{
		component: WorkspaceDashboard,
		ssr: false,
		pendingComponent: Loader,
		errorComponent: ErrorBoundary,
		notFoundComponent: NotFound,
	},
);

function WorkspaceDashboard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { workspaceId } = Route.useParams();
	const [isCreating, setIsCreating] = useState(false);
	const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [workspaceDeleteDialogOpen, setWorkspaceDeleteDialogOpen] =
		useState(false);
	const [deleteConfirmName, setDeleteConfirmName] = useState("");
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [newWorkspaceName, setNewWorkspaceName] = useState("");
	const [formToDelete, setFormToDelete] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	// Use live query for workspace data
	const { data: workspace, isLoading: workspaceLoading } =
		useWorkspace(workspaceId);

	// Use live query for forms data
	const { data: formsData, isLoading: formsLoading } =
		useFormsForWorkspace(workspaceId);
	const forms = formsData ?? [];

	// Sort by updatedAt descending (most recent first)
	const sortedForms = [...forms].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
	// Pagination
	const totalPages = Math.ceil(sortedForms.length / FORMS_PER_PAGE);
	const startIndex = (currentPage - 1) * FORMS_PER_PAGE;
	const paginatedForms = sortedForms.slice(
		startIndex,
		startIndex + FORMS_PER_PAGE,
	);
	console.log(workspace, sortedForms, forms);

	const handleCreateForm = async () => {
		setIsCreating(true);
		try {
			const response = (await createForm({
				data: {
					id: crypto.randomUUID(),
					workspaceId,
					title: "Untitled",
				},
			})) as { form: { id: string } };
			// Invalidate queries to refresh the lists (if still using queries elsewhere)
			await queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] });
			navigate({
				to: "/workspace/$workspaceId/form-builder/$formId",
				params: { workspaceId, formId: response.form.id },
			});
		} catch (error) {
			console.error("Failed to create form:", error);
		} finally {
			setIsCreating(false);
		}
	};

	const handleCreateWorkspace = async () => {
		if (!workspace?.organizationId) {
			console.error("Failed to create workspace: No organization ID available");
			return;
		}
		setIsCreatingWorkspace(true);
		try {
			const newWs = await createWorkspaceLocal(
				workspace.organizationId,
				"Collection",
			);
			navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: newWs.id },
			});
		} catch (error) {
			console.error("Failed to create workspace:", error);
		} finally {
			setIsCreatingWorkspace(false);
		}
	};

	const handleDeleteWorkspace = async () => {
		if (workspace && deleteConfirmName === workspace.name) {
			try {
				await deleteWorkspaceLocal(workspace.id);
				setWorkspaceDeleteDialogOpen(false);
				setDeleteConfirmName("");
				navigate({ to: "/dashboard" });
			} catch (error) {
				console.error("Failed to delete workspace:", error);
			}
		}
	};

	const handleRenameWorkspace = async () => {
		if (workspace && newWorkspaceName.trim()) {
			try {
				await updateWorkspaceName(workspace.id, newWorkspaceName.trim());
				setRenameDialogOpen(false);
			} catch (error) {
				console.error("Failed to rename workspace:", error);
			}
		}
	};

	const openRenameWorkspace = () => {
		if (workspace) {
			setNewWorkspaceName(workspace.name);
			setRenameDialogOpen(true);
		}
	};

	const openDeleteWorkspace = () => {
		if (workspace) {
			setDeleteConfirmName("");
			setWorkspaceDeleteDialogOpen(true);
		}
	};

	const handleDeleteClick = (form: { id: string; title: string }) => {
		setFormToDelete(form);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (formToDelete) {
			try {
				await updateFormStatus(formToDelete.id, "archived");
				// Invalidate queries to refresh the lists (if needed)
				await queryClient.invalidateQueries({
					queryKey: ["forms", workspaceId],
				});
				setDeleteDialogOpen(false);
				setFormToDelete(null);
			} catch (error) {
				console.error("Failed to archive form:", error);
			}
		}
	};

	const handleDuplicate = async (formId: string) => {
		try {
			await duplicateForm({ data: { id: formId } });
			// Invalidate queries to refresh the lists
			await queryClient.invalidateQueries({ queryKey: ["forms", workspaceId] });
		} catch (error) {
			console.error("Failed to duplicate form:", error);
		}
	};

	const formatLastEdited = (timestamp: string) => {
		return `Edited ${formatDistanceToNow(new Date(timestamp))} ago`;
	};

	if (workspace === undefined) {
		return (
			<div className="flex-1 flex items-center justify-center min-h-screen">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Loading workspace...</p>
				</div>
			</div>
		);
	}

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
		<div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
			{/* Main Content */}
			<main className="flex-1 p-6 md:p-12 lg:p-20 max-w-6xl mx-auto w-full">
				<WorkspaceHeader
					name={workspace.name}
					onRename={openRenameWorkspace}
					onDelete={openDeleteWorkspace}
					onNewWorkspace={handleCreateWorkspace}
					onNewForm={handleCreateForm}
					isCreatingWorkspace={isCreatingWorkspace}
					isCreatingForm={isCreating}
				/>

				{/* Forms List */}
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4">
						{paginatedForms.map((form) => (
							<div
								key={form.id}
								className="group flex flex-col p-2 -mx-2 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-pointer"
								onClick={() =>
									navigate({
										to: "/workspace/$workspaceId/form-builder/$formId",
										params: { workspaceId, formId: form.id },
									})
								}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex flex-col">
											<div className="flex items-center gap-2">
												<span className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
													{form.title || "Untitled"}
												</span>
												<Badge
													variant="secondary"
													className={`text-[10px] h-4 px-1.5 font-normal ${
														form.status === "published"
															? "bg-green-100 text-green-700"
															: "bg-muted/80 text-muted-foreground"
													} rounded-full`}
												>
													{form.status === "published" ? "Published" : "Draft"}
												</Badge>
											</div>
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 font-medium">
												<span>0 submissions</span>
												<span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30"></span>
												<span>{formatLastEdited(form.updatedAt)}</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-full hover:bg-muted"
														onClick={(e) => {
															e.stopPropagation();
															handleDuplicate(form.id);
														}}
													>
														<Copy className="h-4 w-4 text-muted-foreground" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Duplicate</TooltipContent>
											</Tooltip>

											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteClick({
																id: form.id,
																title: form.title || "Untitled",
															});
														}}
													>
														<Trash2 className="h-4 w-4 text-muted-foreground" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Delete</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
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
								{isCreating && (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								)}
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

			{/* Workspace Delete Confirmation Dialog */}
			<AlertDialog
				open={workspaceDeleteDialogOpen}
				onOpenChange={(open) => {
					setWorkspaceDeleteDialogOpen(open);
					if (!open) setDeleteConfirmName("");
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete workspace</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4">
								<p>
									This will permanently delete{" "}
									<strong>"{workspace?.name}"</strong> and all forms within it.
									This action cannot be undone.
								</p>
								<div className="space-y-2">
									<p className="text-sm">
										Type <strong>{workspace?.name}</strong> to confirm:
									</p>
									<Input
										value={deleteConfirmName}
										onChange={(e) => setDeleteConfirmName(e.target.value)}
										placeholder="Type workspace name to confirm"
										className="mt-2"
									/>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteWorkspace}
							disabled={deleteConfirmName !== workspace?.name}
							className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Delete workspace
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Workspace Rename Dialog */}
			<Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename workspace</DialogTitle>
						<DialogDescription>
							Enter a new name for this workspace.
						</DialogDescription>
					</DialogHeader>
					<Input
						value={newWorkspaceName}
						onChange={(e) => setNewWorkspaceName(e.target.value)}
						placeholder="Workspace name"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleRenameWorkspace();
							}
						}}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRenameDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleRenameWorkspace}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
