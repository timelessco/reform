import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
	ChevronLeft,
	ChevronRight,
	Copy,
	FileText,
	HelpCircle,
	Loader2,
	Plus,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForms, useWorkspaces } from "@/hooks/use-live-hooks";
import { auth, useSession } from "@/lib/auth-client";
import { createForm, duplicateForm, updateForm } from "@/lib/fn/forms";
import { getWorkspacesWithFormsQueryOptions } from "@/lib/fn/workspaces";
import { syncLocalDataToCloud } from "@/lib/sync";

const FORMS_PER_PAGE = 10;

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
	ssr: false,
	loader: async ({ context }) => {
		const [activeOrg, orgsData, workspacesData] = await Promise.all([
			context.queryClient.ensureQueryData({
				...auth.organization.getFullOrganization.queryOptions(),
				revalidateIfStale: true,
			}),
			context.queryClient.ensureQueryData({
				...auth.organization.list.queryOptions(),
				revalidateIfStale: true,
			}),
			context.queryClient.ensureQueryData({
				...getWorkspacesWithFormsQueryOptions(),
				revalidateIfStale: true,
			}),
		]);
		return {
			activeOrg,
			orgsData,
			workspacesData,
		};
	},
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function DashboardPage() {
	const navigate = useNavigate();
	const {
		activeOrg,
		orgsData,
		workspacesData: initialWorkspacesData,
	} = Route.useLoaderData();
	const [isCreating, setIsCreating] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [formToDelete, setFormToDelete] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	// Get current session/user
	const { data: session } = useSession();

	// Live queries for real-time sync
	const { data: liveWorkspaces, isReady: wsReady } = useWorkspaces();
	const { data: liveForms, isReady: formsReady } = useForms();
	console.log(liveWorkspaces, wsReady, "wsReady");
	const isLiveReady = wsReady && formsReady;
	// Hybrid approach: use live data when ready, fallback to loader data
	const orgWorkspaces = isLiveReady
		? (liveWorkspaces ?? []).filter((ws) => ws.organizationId === activeOrg?.id)
		: (initialWorkspacesData?.workspaces ?? []).filter(
				(ws) => ws.organizationId === activeOrg?.id,
			);
	// Forms: use live forms when ready, otherwise flatten from loader workspaces data
	const orgForms = isLiveReady
		? (liveForms ?? [])
				.filter((form) =>
					orgWorkspaces.some((ws) => ws.id === form.workspaceId),
				)
				.filter((form) => form.status !== "archived")
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
		: orgWorkspaces
				.flatMap((ws) =>
					((ws as any).forms ?? []).map((f: any) => ({
						...f,
						workspaceId: ws.id,
						status: f.status ?? "draft",
					})),
				)
				.filter((form: any) => form.status !== "archived")
				.sort(
					(a: any, b: any) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				);
	// Create workspace name lookup
	const workspaceNameMap = new Map(orgWorkspaces.map((ws) => [ws.id, ws.name]));

	// Pagination
	const totalPages = Math.ceil(orgForms.length / FORMS_PER_PAGE);
	const startIndex = (currentPage - 1) * FORMS_PER_PAGE;
	const paginatedForms = orgForms.slice(
		startIndex,
		startIndex + FORMS_PER_PAGE,
	);

	const setActiveMutation = useMutation(
		auth.organization.setActive.mutationOptions({
			onSuccess: () => {
				// Refetch route data to get updated active org
				navigate({ to: "/dashboard", replace: true });
			},
		}),
	);

	// Set active organization if user has orgs but none is active
	useEffect(() => {
		if (!session?.user) return;
		if (!activeOrg && orgsData && orgsData.length > 0) {
			setActiveMutation.mutate({ organizationId: orgsData[0].id });
		}
	}, [activeOrg, orgsData, session, setActiveMutation]);

	// Handle sync after social login redirect
	useEffect(() => {
		const syncData = async () => {
			const shouldSync = sessionStorage.getItem("shouldSyncAfterSocialLogin");
			if (shouldSync === "true" && session?.user) {
				// Clear the flag immediately to prevent multiple syncs
				sessionStorage.removeItem("shouldSyncAfterSocialLogin");

				// Wait a bit for session to be fully established and queries to be ready
				try {
					await syncLocalDataToCloud();
					toast.success("Local data synced successfully!");
					// Live queries will automatically pick up the synced data
				} catch (error) {
					console.error("Failed to sync local data:", error);
					toast.error("Signed in but failed to sync local data");
				}
			}
		};
		syncData();
	}, [session]);

	const handleCreateForm = async () => {
		if (orgWorkspaces.length === 0) return;

		setIsCreating(true);
		try {
			const defaultWorkspace = orgWorkspaces[0];
			const response = (await createForm({
				data: {
					id: crypto.randomUUID(),
					workspaceId: defaultWorkspace.id,
					title: "Untitled",
				},
			})) as { form: { id: string } };
			// Live queries will automatically pick up the new form
			navigate({
				to: "/workspace/$workspaceId/form-builder/$formId/edit",
				params: { workspaceId: defaultWorkspace.id, formId: response.form.id },
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
			try {
				await updateForm({ data: { id: formToDelete.id, status: "archived" } });
				// Live queries will automatically pick up the archived form
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
			// Live queries will automatically pick up the duplicated form
		} catch (error) {
			console.error("Failed to duplicate form:", error);
		}
	};

	const formatLastEdited = (timestamp: string) => {
		return `Edited ${formatDistanceToNow(new Date(timestamp))} ago`;
	};

	return (
		<div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
			{/* Main Content */}
			<main className="flex-1 p-6 md:p-12 lg:p-20 max-w-6xl mx-auto w-full">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-bold">All Forms</h1>
						<p className="text-sm text-muted-foreground mt-1">
							{orgForms.length} form{orgForms.length !== 1 ? "s" : ""} across{" "}
							{orgWorkspaces.length} workspace
							{orgWorkspaces.length !== 1 ? "s" : ""}
						</p>
					</div>
					<Button
						onClick={handleCreateForm}
						disabled={isCreating || orgWorkspaces.length === 0}
					>
						{isCreating ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Plus className="h-4 w-4 mr-2" />
						)}
						New Form
					</Button>
				</div>

				{/* Forms List */}
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4">
						{paginatedForms.map((form) => (
							<div
								key={form.id}
								className="group flex flex-col p-2 -mx-2 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-pointer"
							>
								<Link
									to={"/workspace/$workspaceId/form-builder/$formId/edit"}
									params={{ workspaceId: form.workspaceId, formId: form.id }}
									preloadDelay={1000}
									preload="intent"
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
														{form.status === "published"
															? "Published"
															: "Draft"}
													</Badge>
												</div>
												<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 font-medium">
													<span>
														{workspaceNameMap.get(form.workspaceId) ||
															"Unknown workspace"}
													</span>
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
																e.preventDefault();
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
																e.preventDefault();
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
								</Link>
							</div>
						))}
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Showing {startIndex + 1}-
								{Math.min(startIndex + FORMS_PER_PAGE, orgForms.length)} of{" "}
								{orgForms.length} forms
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

					{orgForms.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-2xl bg-muted/20">
							<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
								<FileText className="h-6 w-6 text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<p className="font-medium">No forms yet</p>
								<p className="text-sm text-muted-foreground max-w-xs">
									Create your first form to get started.
								</p>
							</div>
							<Button
								size="sm"
								onClick={handleCreateForm}
								disabled={isCreating || orgWorkspaces.length === 0}
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
		</div>
	);
}
