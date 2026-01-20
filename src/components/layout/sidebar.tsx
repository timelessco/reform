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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import { type Workspace } from "@/db-collections";
import { auth, useSession } from "@/lib/auth-client";
import { createForm } from "@/lib/fn/forms";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { editorDocCollection } from "@/db-collections";
import { ClientOnly } from "@/components/client-only";
import {
	createWorkspace,
	deleteWorkspace,
	getWorkspacesWithForms,
	updateWorkspace,
} from "@/lib/fn/workspaces";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
	Bell,
	BookOpen,
	ChevronRight,
	FileText,
	Gift,
	Globe,
	HelpCircle,
	Home,
	LayoutTemplate,
	LogOut,
	Map,
	MessageSquare,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Settings,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { logger } from "@/lib/utils";


const data = {
	navMain: [
		{
			title: "Home",
			url: "/dashboard",
			icon: Home,
		},
		{
			title: "Search",
			url: "#",
			icon: Search,
		},
		{
			title: "Members",
			url: "#",
			icon: Users,
		},
		{
			title: "Domains",
			url: "#",
			icon: Globe,
		},
		{
			title: "Settings",
			url: "#",
			icon: Settings,
		},
		{
			title: "Upgrade plan",
			url: "#",
			icon: Sparkles,
			className: "text-purple-500",
		},
	],
	products: [
		{
			title: "Templates",
			url: "#",
			icon: LayoutTemplate,
		},
		{
			title: "What's new",
			url: "#",
			icon: Bell,
		},
		{
			title: "Roadmap",
			url: "#",
			icon: Map,
		},
		{
			title: "Feature requests",
			url: "#",
			icon: MessageSquare,
		},
		{
			title: "Rewards",
			url: "#",
			icon: Gift,
		},
		{
			title: "Trash",
			url: "#",
			icon: Trash2,
		},
	],
	help: [
		{
			title: "Get started",
			url: "#",
			icon: FileText,
		},
		{
			title: "How-to guides",
			url: "#",
			icon: BookOpen,
		},
		{
			title: "Help center",
			url: "#",
			icon: HelpCircle,
		},
		{
			title: "Contact support",
			url: "#",
			icon: MessageSquare,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { data: sessionData } = useSession();
	const location = useLocation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const user = sessionData?.user;
	const { isMobile } = useSidebar();
	const { data: workspacesResponse } = useQuery({
		queryKey: ["workspaces"],
		queryFn: () => getWorkspacesWithForms(),
	});

	const workspaces = workspacesResponse?.workspaces || [];

	// State for dialogs
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
		null,
	);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [workspaceToRename, setWorkspaceToRename] = useState<Workspace | null>(
		null,
	);
	const [newWorkspaceName, setNewWorkspaceName] = useState("");

	const signOutMutation = useMutation(
		auth.signOut.mutationOptions({
			onSuccess: () => {
				router.navigate({ to: "/" });
			},
		}),
	);

	const handleCreateWorkspace = async () => {
		try {
			const response = await createWorkspace({
				data: {
					name: 'New WorkSpace'
				}
			});
			await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
			router.navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: response.workspace.id },
			});
		} catch (error) {
			console.error("Failed to create workspace:", error);
		}
	};

	const handleDeleteWorkspace = async () => {
		if (!workspaceToDelete) return;
		try {
			await deleteWorkspace({
				data: { id: workspaceToDelete.id },
			});
			await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
			setDeleteDialogOpen(false);
			setWorkspaceToDelete(null);
			// Navigate to dashboard if we deleted the current workspace
			router.navigate({ to: "/dashboard" });
		} catch (error) {
			console.error("Failed to delete workspace:", error);
		}
	};

	const handleRenameWorkspace = async () => {
		if (!workspaceToRename || !newWorkspaceName.trim()) return;
		try {
			await updateWorkspace({
				data: {
					id: workspaceToRename.id,
					name: newWorkspaceName.trim(),
				},
			});
			await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
			setRenameDialogOpen(false);
			setWorkspaceToRename(null);
			setNewWorkspaceName("");
		} catch (error) {
			console.error("Failed to rename workspace:", error);
		}
	};

	const openRenameDialog = (workspace: Workspace) => {
		setWorkspaceToRename(workspace);
		setNewWorkspaceName(workspace.name);
		setRenameDialogOpen(true);
	};

	const openDeleteDialog = (workspace: Workspace) => {
		setWorkspaceToDelete(workspace);
		setDeleteDialogOpen(true);
	};

	return (
		<>
			<Sidebar
				variant="sidebar"
				collapsible="offcanvas"
				className="bg-muted/30"
				{...props}
			>
				<SidebarHeader className="flex-row items-center justify-between p-0">
					<div className="group-data-[collapsible=icon]:hidden w-full">
						<SidebarMenu>
							<SidebarMenuItem>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<SidebarMenuButton
											size="lg"
											className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
										>
											<Avatar className="h-8 w-8 rounded-lg">
												<AvatarImage
													src={user?.image || ""}
													alt={user?.name || ""}
												/>
												<AvatarFallback className="rounded-lg">
													{user?.name?.charAt(0) || "U"}
												</AvatarFallback>
											</Avatar>
											<div className="grid flex-1 text-left text-sm leading-tight">
												<span className="truncate font-semibold">
													{user?.name || "User"}
												</span>
											</div>
											<ChevronRight className="ml-auto h-4 w-4 rotate-90" />
										</SidebarMenuButton>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
										align="start"
										side={isMobile ? "bottom" : "right"}
										sideOffset={4}
									>
										<DropdownMenuItem asChild>
											<Link to="/dashboard" className="flex items-center gap-2">
												<Home className="h-4 w-4" />
												<span>Home</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<Users className="h-4 w-4 mr-2" />
											<span>Members</span>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<Globe className="h-4 w-4 mr-2" />
											<span>Domains</span>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link
												to="/settings/my-account"
												className="flex items-center gap-2"
											>
												<Settings className="h-4 w-4" />
												<span>Settings</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => signOutMutation.mutate({})}
											className="text-destructive"
										>
											<LogOut className="h-4 w-4 mr-2" />
											<span>Log out</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						</SidebarMenu>
					</div>
					<SidebarTrigger />
				</SidebarHeader>
				<SidebarContent className="group-data-[collapsible=icon]:hidden">
					<SidebarGroup>
						<SidebarMenu>
							{data.navMain.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={location.pathname === item.url}
										tooltip={item.title}
										className={item.className}
									>
										<Link to={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>

					<SidebarGroup>
						<SidebarGroupLabel>Workspaces</SidebarGroupLabel>
						<SidebarGroupAction
							title="Add Workspace"
							onClick={handleCreateWorkspace}
						>
							<Plus />
							<span className="sr-only">Add Workspace</span>
						</SidebarGroupAction>
						<SidebarMenu>
							{workspaces.map((workspace) => (
								<WorkspaceItem
									key={workspace.id}
									workspace={workspace}
									isMobile={isMobile}
									onRename={() => openRenameDialog(workspace)}
									onDelete={() => openDeleteDialog(workspace)}
								/>
							))}
							{workspaces.length === 0 && (
								<SidebarMenuItem>
									<span className="text-muted-foreground text-xs px-2 py-1">
										No workspaces yet
									</span>
								</SidebarMenuItem>
							)}
						</SidebarMenu>
					</SidebarGroup>

					<SidebarGroup>
						<SidebarGroupLabel>Product</SidebarGroupLabel>
						<SidebarMenu>
							{data.products.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild tooltip={item.title}>
										<Link to={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>

					<SidebarGroup>
						<SidebarGroupLabel>Help</SidebarGroupLabel>
						<SidebarMenu>
							{data.help.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild tooltip={item.title}>
										<Link to={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter className="group-data-[collapsible=icon]:hidden">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton tooltip="Quick help">
								<HelpCircle className="h-4 w-4" />
								<span>Support</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>

			{/* Delete Workspace Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete workspace</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{workspaceToDelete?.name}"? This
							will also delete all forms in this workspace. This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteWorkspace}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Rename Workspace Dialog */}
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
		</>
	);
}

// Client-only component that fetches form title from local DB
function FormTitleFromLocalDB({ formId }: { formId: string }) {
	const { data: formData } = useLiveQuery((q) =>
		q
			.from({ doc: editorDocCollection })
			.where(({ doc }) => eq(doc.id, formId))
			.select(({ doc }) => ({ title: doc.title }))
	);

	return <>{formData?.[0]?.title || "Untitled"}</>;
}

// Form item component that uses live query for real-time title updates
function FormItem({ formId, workspaceId }: { formId: string; workspaceId: string }) {
	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton asChild>
				<Link
					to="/workspace/$workspaceId/form-builder/$formId"
					params={{ workspaceId, formId }}
				>
					<span>
						<ClientOnly fallback="Loading...">
							<FormTitleFromLocalDB formId={formId} />
						</ClientOnly>
					</span>
				</Link>
			</SidebarMenuSubButton>
		</SidebarMenuSubItem>
	);
}

// Type for workspace with forms from server
type WorkspaceWithForms = Workspace & {
	forms: Array<{ id: string; title: string; updatedAt: string; workspaceId: string }>;
};

// Workspace item component with forms
function WorkspaceItem({
	workspace,
	isMobile,
	onRename,
	onDelete,
}: {
	workspace: WorkspaceWithForms;
	isMobile: boolean;
	onRename: () => void;
	onDelete: () => void;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	// Use forms list from server - each FormItem will use useLiveQuery for real-time sync of individual form details
	const forms = workspace.forms || [];
	const handleCreateForm = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			const response = await createForm({
				data: {
					id: crypto.randomUUID(),
					workspaceId: workspace.id,
					title: "Untitled",
				},
			}) as { form: { id: string } };
			await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
			router.navigate({
				to: "/workspace/$workspaceId/form-builder/$formId",
				params: { workspaceId: workspace.id, formId: response.form.id },
			});
		} catch (error) {
			console.error("Failed to create form:", error);
		}
	};

	return (
		<Collapsible defaultOpen className="group/collapsible">
			<SidebarMenuItem>
				<div className="flex items-center">
					<CollapsibleTrigger asChild>
						<SidebarMenuButton tooltip={workspace.name} className="flex-1">
							<ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
							<Link
								to="/workspace/$workspaceId"
								params={{ workspaceId: workspace.id }}
								className="flex-1 truncate hover:text-foreground"
							>
								<span className="truncate">{workspace.name}</span>
							</Link>
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuAction showOnHover>
								<MoreHorizontal />
								<span className="sr-only">More</span>
							</SidebarMenuAction>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-48"
							side={isMobile ? "bottom" : "right"}
							align={isMobile ? "end" : "start"}
						>
							<DropdownMenuItem onClick={onRename}>
								<Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
								<span>Rename</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={onDelete}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<SidebarMenuAction showOnHover onClick={handleCreateForm}>
						<Plus />
						<span className="sr-only">Add Form</span>
					</SidebarMenuAction>
				</div>
				<CollapsibleContent>
					<SidebarMenuSub>
						{forms.map((form) => (
							<FormItem
								key={form.id}
								formId={form.id}
								workspaceId={form.workspaceId}
							/>
						))}
						{forms.length === 0 && (
							<SidebarMenuSubItem>
								<span className="text-muted-foreground text-xs px-2 py-1">
									No forms yet
								</span>
							</SidebarMenuSubItem>
						)}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}
