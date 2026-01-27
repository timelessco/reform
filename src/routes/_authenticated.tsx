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
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
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
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	createFormLocal,
	createWorkspaceLocal,
	deleteWorkspaceLocal,
	updateWorkspaceName,
} from "@/db-collections";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useForm, useForms, useWorkspaces } from "@/hooks/use-live-hooks";
import { auth, useSession } from "@/lib/auth-client";
import { OrganizationSwitcher } from "@/components/org/org-switcher";
import { authMiddleware } from "@/middleware/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import {
	Bell,
	BookOpen,
	ChevronRight,
	FileText,
	Gift,
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
import { useEffect, useMemo, useState } from "react";

// Route configuration
export const Route = createFileRoute("/_authenticated")({
	server: {
		middleware: [authMiddleware],
	},
	component: AuthLayout,
	pendingComponent: () => <div>loading.....</div>,
	ssr : 'data-only'
});

function AuthLayout() {
	return (
		<SidebarProvider defaultOpen={true}>
			<div className="flex min-h-screen w-full">
				<AppSidebar />
				<SidebarInset className="flex flex-col flex-1 min-h-screen">
					<Outlet />
				</SidebarInset>
			</div>
		</SidebarProvider>
	);
}

// Sidebar navigation data
const sidebarData = {
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
			title: "Settings",
			url: "#",
			icon: Settings,
		},
		{
			title: "Upgrade plan",
			url: "/settings/billing",
			icon: Sparkles,
			className: "text-purple-500",
		},
		{
			title: "Invitations",
			url: "/accept-invite",
			icon: Bell,
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

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const location = useLocation();
	const router = useRouter();
	const {
		toggle: togglePalette,
		isOpen: isPaletteOpen,
		setIsOpen: setIsPaletteOpen,
	} = useCommandPalette();

	const { data: activeOrg } = useQuery(
		auth.organization.getFullOrganization.queryOptions(),
	);

	const { data: invitations } = useQuery(
		auth.organization.listInvitations.queryOptions(),
	);
	const pendingCount = invitations?.length ?? 0;

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				togglePalette();
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [togglePalette]);

	const { data: session } = useSession();

	const signOutMutation = useMutation(
		auth.signOut.mutationOptions({
			onSuccess: () => {
				router.navigate({ to: "/" });
			},
		}),
	);

	const handleCreateWorkspace = async () => {
		if (!activeOrg) return;
		try {
			const workspace = await createWorkspaceLocal(
				activeOrg.id,
				"New Workspace",
			);
			router.navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: workspace.id },
			});
		} catch (error) {
			console.error("Failed to create workspace:", error);
		}
	};

	const navMain = useMemo(() => {
		return sidebarData.navMain.map((item) => {
			if (item.title === "Members") {
				return {
					...item,
					url: "/settings/members",
				};
			}
			if (item.title === "Settings") {
				return {
					...item,
					url: "/settings",
				};
			}
			return item;
		});
	}, []);

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
						<OrganizationSwitcher />
					</div>
					<SidebarTrigger />
				</SidebarHeader>
				<SidebarContent className="group-data-[collapsible=icon]:hidden">
					<SidebarGroup>
						<SidebarMenu>
							{navMain.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={location.pathname === item.url}
										tooltip={item.title}
										className={item.className}
										onClick={(e) => {
											if (item.title === "Search") {
												e.preventDefault();
												togglePalette();
											}
										}}
									>
										{/* @ts-ignore */}
										<Link to={item.url}>
											<item.icon />
											<span>{item.title}</span>
											{item.title === "Invitations" && pendingCount > 0 && (
												<span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
													{pendingCount}
												</span>
											)}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>

					<SidebarWorkspaces activeOrgId={activeOrg?.id} />

					<SidebarGroup>
						<SidebarGroupLabel>Product</SidebarGroupLabel>
						<SidebarMenu>
							{sidebarData.products.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild tooltip={item.title}>
										{/* @ts-ignore */}
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
							{sidebarData.help.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild tooltip={item.title}>
										{/* @ts-ignore */}
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
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton tooltip="User Settings">
										<Avatar className="h-4 w-4 rounded-full">
											<AvatarImage src={session?.user?.image || ""} />
											<AvatarFallback>
												{session?.user?.name?.charAt(0)}
											</AvatarFallback>
										</Avatar>
										<span>{session?.user?.name}</span>
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="right" align="end" className="w-48">
									<DropdownMenuItem asChild>
										<Link to="/settings/my-account">My Account</Link>
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => signOutMutation.mutate({})}>
										<LogOut className="h-4 w-4 mr-2" />
										<span>Log out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>

			{/* Command Palette */}
			<CommandDialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
				<CommandInput placeholder="Search for forms and help articles" />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Actions">
						<CommandItem
							onSelect={() => {
								setIsPaletteOpen(false);
							}}
						>
							<Plus className="mr-2 h-4 w-4" />
							<span>New form</span>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								handleCreateWorkspace();
								setIsPaletteOpen(false);
							}}
						>
							<LayoutTemplate className="mr-2 h-4 w-4" />
							<span>New workspace</span>
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Navigation">
						<CommandItem
							onSelect={() => {
								router.navigate({ to: "/dashboard" });
								setIsPaletteOpen(false);
							}}
						>
							<Home className="mr-2 h-4 w-4" />
							<span>Go to home</span>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								setIsPaletteOpen(false);
							}}
						>
							<LayoutTemplate className="mr-2 h-4 w-4" />
							<span>Go to templates</span>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								router.navigate({ to: "/settings/my-account" });
								setIsPaletteOpen(false);
							}}
						>
							<Settings className="mr-2 h-4 w-4" />
							<span>Go to settings</span>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								setIsPaletteOpen(false);
							}}
						>
							<HelpCircle className="mr-2 h-4 w-4" />
							<span>Go to help center</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}

// Client-only component that fetches form title from local DB
function FormTitleFromLocalDB({ formId }: { formId: string }) {
	const { data: formData } = useForm(formId);
	return <>{formData?.[0]?.title || "Untitled"}</>;
}

// Form item component that uses live query for real-time title updates
function FormItem({
	formId,
	workspaceId,
}: {
	formId: string;
	workspaceId: string;
}) {
	return (
		<SidebarMenuSubItem>
			<Link
				to="/workspace/$workspaceId/form-builder/$formId"
				params={{ workspaceId, formId }}
				className="flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0 text-sm"
			>
				<span>
					<FormTitleFromLocalDB formId={formId} />
				</span>
			</Link>
		</SidebarMenuSubItem>
	);
}

// Type for workspace with forms from server
type WorkspaceWithForms = {
	id: string;
	organizationId: string;
	createdByUserId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	forms: Array<{
		id: string;
		title: string;
		updatedAt: string;
		workspaceId: string;
	}>;
};

// Workspaces section - uses live queries for real-time sync
function SidebarWorkspaces({ activeOrgId }: { activeOrgId?: string }) {
	const router = useRouter();
	const { isMobile } = useSidebar();

	// Use live queries for real-time sync
	const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces();
	const { data: formsData, isLoading: formsLoading } = useForms();

	// Determine if Electric has synced
	const isLoading = workspacesLoading || formsLoading;
	const isElectricReady = !isLoading && workspacesData !== undefined && formsData !== undefined;

	// Combine workspaces with their forms, filtered by active organization
	const workspaces = useMemo(() => {
		if (!activeOrgId || !isElectricReady) return [];

		const formsByWorkspace = (formsData || []).reduce(
			(acc, form) => {
				if (!acc[form.workspaceId]) acc[form.workspaceId] = [];
				acc[form.workspaceId].push(form);
				return acc;
			},
			{} as Record<string, typeof formsData>,
		);

		return (workspacesData || [])
			.filter((ws) => ws.organizationId === activeOrgId)
			.map((ws) => ({
				...ws,
				// Sort forms by recently edited (most recent first)
				forms: (formsByWorkspace[ws.id] || []).sort(
					(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
				),
			}));
	}, [workspacesData, formsData, activeOrgId, isElectricReady]);
	// State for dialogs
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [workspaceToDelete, setWorkspaceToDelete] =
		useState<WorkspaceWithForms | null>(null);
	const [deleteConfirmName, setDeleteConfirmName] = useState("");
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [workspaceToRename, setWorkspaceToRename] = useState<WorkspaceWithForms | null>(null);
	const [newWorkspaceName, setNewWorkspaceName] = useState("");

	const handleCreateWorkspace = async () => {
		if (!activeOrgId) return;
		try {
			const workspace = await createWorkspaceLocal(
				activeOrgId,
				"New Workspace",
			);
			router.navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: workspace.id },
			});
		} catch (error) {
			console.error("Failed to create workspace:", error);
		}
	};

	const handleDeleteWorkspace = async () => {
		if (!workspaceToDelete || deleteConfirmName !== workspaceToDelete.name)
			return;
		try {
			await deleteWorkspaceLocal(workspaceToDelete.id);
			setDeleteDialogOpen(false);
			setWorkspaceToDelete(null);
			setDeleteConfirmName("");
			router.navigate({ to: "/dashboard" });
		} catch (error) {
			console.error("Failed to delete workspace:", error);
		}
	};

	const handleRenameWorkspace = async () => {
		if (!workspaceToRename || !newWorkspaceName.trim()) return;
		try {
			await updateWorkspaceName(workspaceToRename.id, newWorkspaceName.trim());
			setRenameDialogOpen(false);
			setWorkspaceToRename(null);
			setNewWorkspaceName("");
		} catch (error) {
			console.error("Failed to rename workspace:", error);
		}
	};

	const openRenameDialog = (workspace: WorkspaceWithForms) => {
		setWorkspaceToRename(workspace);
		setNewWorkspaceName(workspace.name);
		setRenameDialogOpen(true);
	};

	const openDeleteDialog = (workspace: WorkspaceWithForms) => {
		setWorkspaceToDelete(workspace);
		setDeleteConfirmName("");
		setDeleteDialogOpen(true);
	};

	return (
		<>
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
					{isLoading ? (
						<>
							{[1, 2].map((i) => (
								<SidebarMenuItem key={i}>
									<div className="flex items-center gap-2 px-2 py-1.5">
										<div className="h-4 w-4 rounded bg-sidebar-accent animate-pulse" />
										<div className="h-4 flex-1 rounded bg-sidebar-accent animate-pulse" />
									</div>
								</SidebarMenuItem>
							))}
						</>
					) : (
						<>
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
						</>
					)}
				</SidebarMenu>
			</SidebarGroup>

			{/* Delete Workspace Confirmation Dialog */}
			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
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
									<strong>"{workspaceToDelete?.name}"</strong> and{" "}
									<strong>
										{workspaceToDelete?.forms?.length || 0} form
										{(workspaceToDelete?.forms?.length || 0) !== 1 ? "s" : ""}
									</strong>{" "}
									within it. This action cannot be undone.
								</p>
								<div className="space-y-2">
									<p className="text-sm">
										Type <strong>{workspaceToDelete?.name}</strong> to confirm:
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
							disabled={deleteConfirmName !== workspaceToDelete?.name}
							className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Delete workspace
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
	// Use forms list from live query - real-time sync
	const forms = workspace.forms || [];
	const handleCreateForm = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			const newForm = await createFormLocal(workspace.id, "Untitled");
			router.navigate({
				to: "/workspace/$workspaceId/form-builder/$formId",
				params: { workspaceId: workspace.id, formId: newForm.id },
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
						<SidebarMenuButton
							tooltip={workspace.name}
							className="flex-1 pr-14"
						>
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
					<SidebarMenuAction
						showOnHover
						onClick={handleCreateForm}
						className="right-7"
					>
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
