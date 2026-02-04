import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
	useRouter,
} from "@tanstack/react-router";
import {
	Bell,
	ChevronDown,
	ChevronRight,
	ChevronsLeft,
	FileText,
	Filter,
	HelpCircle,
	Home,
	Inbox,
	LayoutGrid,
	LogOut,
	Moon,
	MoreHorizontal,
	Pencil,
	PencilLine,
	Plus,
	Search,
	Settings,
	Sun,
	Trash2,
	Undo2,
	UserPlus,
	Users,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
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
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
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
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
	MinimalSidebarProvider,
	useMinimalSidebar,
} from "@/contexts/minimal-sidebar-context";
import {
	createWorkspaceLocal,
	deleteWorkspaceLocal,
	permanentDeleteFormLocal,
	restoreFormLocal,
	updateWorkspaceName,
} from "@/db-collections";
import { useCommandPalette } from "@/hooks/use-command-palette";
import {
	useArchivedForms,
	useFavoriteForms,
	useForms,
	useWorkspaces,
} from "@/hooks/use-live-hooks";
import { auth, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { authMiddleware } from "@/middleware/auth";

// Route configuration
export const Route = createFileRoute("/_authenticated")({
	server: {
		middleware: [authMiddleware],
	},
	component: AuthLayout,
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
	ssr: "data-only",
});

function AuthLayout() {
	return (
		<MinimalSidebarProvider>
			<AuthLayoutContent />
		</MinimalSidebarProvider>
	);
}

function AuthLayoutContent() {
	const { isPinned, setIsHovered, isInboxOpen } = useMinimalSidebar();
	const location = useLocation();
	const { pathname } = location;

	// Extract route params from URL
	const workspaceMatch = pathname.match(/\/workspace\/([^/]+)/);
	const formMatch = pathname.match(/\/form-builder\/([^/]+)/);
	const workspaceId = workspaceMatch?.[1];
	const formId = formMatch?.[1];
	return (
		<div className="flex min-h-screen w-full overflow-hidden relative">
			{/* Hover Trigger Area - An invisible area at the left edge to detect hover */}
			{!isPinned && (
				<button
					type="button"
					aria-hidden="true"
					tabIndex={-1}
					className="fixed left-0 top-12 bottom-0 w-4 z-60"
					onMouseEnter={() => setIsHovered(true)}
				/>
			)}

			<MinimalSidebar />
			<SidebarInbox />

			<div
				className={cn(
					"flex flex-col flex-1 min-h-screen min-w-0 transition-all duration-300 ease-in-out",
					isInboxOpen
						? isPinned
							? "ml-[544px]"
							: "ml-80"
						: isPinned
							? "ml-56"
							: "ml-0",
				)}
			>
				<AppHeader formId={formId} workspaceId={workspaceId} />
				<Outlet />
			</div>
		</div>
	);
}

// Minimal Sidebar Item Component
interface SidebarItemProps {
	to?: string;
	label: string;
	isNested?: boolean;
	isActive?: boolean;
	onClick?: () => void;
	prefix?: React.ReactNode;
}

function SidebarItem({
	to,
	label,
	isNested,
	isActive,
	onClick,
	prefix,
	children,
}: SidebarItemProps & { children?: React.ReactNode }) {
	const Component: React.ElementType = to ? Link : "button";
	const componentProps = to ? { to } : { type: "button" as const };

	return (
		<Component
			{...componentProps}
			onClick={onClick}
			className={cn(
				"group flex w-full items-center justify-between rounded px-2 py-1 text-[13px] transition-colors hover:text-foreground relative cursor-pointer",
				!to && "text-muted-foreground/80",
				isNested && "py-0.5 px-1",
				isActive && "text-foreground font-medium",
				!isActive && "text-muted-foreground/80",
			)}
		>
			<span className="flex items-center gap-2 overflow-hidden flex-1">
				{isActive && !isNested && (
					<span className="absolute -left-6 h-4 w-0.5 bg-foreground" />
				)}
				<span className="flex items-center gap-1.5 flex-1 overflow-hidden">
					{prefix}
					<span className="truncate">{label}</span>
				</span>
				{isActive && isNested && (
					<span className="absolute -left-2 h-3.5 w-1 bg-foreground rounded-full" />
				)}
			</span>
			{children}
		</Component>
	);
}

// Minimal Sidebar Component
function MinimalSidebar() {
	const {
		isVisible,
		isPinned,
		togglePin,
		setIsHovered,
		isInboxOpen,
		setIsInboxOpen,
	} = useMinimalSidebar();
	const sidebarRef = useRef<HTMLDivElement>(null);
	const location = useLocation();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const {
		toggle: togglePalette,
		isOpen: isPaletteOpen,
		setIsOpen: setIsPaletteOpen,
	} = useCommandPalette();

	// Trash dialog state
	const [trashDialogOpen, setTrashDialogOpen] = useState(false);

	const { data: activeOrg } = useQuery(
		auth.organization.getFullOrganization.queryOptions(),
	);

	const { data: invitations } = useQuery(
		auth.organization.listInvitations.queryOptions(),
	);
	const pendingCount = invitations?.length ?? 0;

	const { data: session } = useSession();

	const signOutMutation = useMutation(
		auth.signOut.mutationOptions({
			onSuccess: () => {
				router.navigate({ to: "/" });
			},
		}),
	);

	const { data: orgs } = useQuery(auth.organization.list.queryOptions());

	const setActiveOrgMutation = useMutation(
		auth.organization.setActive.mutationOptions({
			onSuccess: () => {
				router.invalidate();
			},
		}),
	);

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

	useEffect(() => {
		const node = sidebarRef.current;
		if (!node) return;

		const handleMouseEnterSidebar = () => setIsHovered(true);
		const handleMouseLeaveSidebar = () => setIsHovered(false);

		node.addEventListener("mouseenter", handleMouseEnterSidebar);
		node.addEventListener("mouseleave", handleMouseLeaveSidebar);

		return () => {
			node.removeEventListener("mouseenter", handleMouseEnterSidebar);
			node.removeEventListener("mouseleave", handleMouseLeaveSidebar);
		};
	}, [setIsHovered]);

	const getInitials = (name?: string | null) => {
		if (!name) return "U";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const displayName = activeOrg?.name || session?.user?.name || "User";

	return (
		<>
			<div
				ref={sidebarRef}
				className={cn(
					"fixed left-0 z-50 flex w-56 flex-col bg-background p-3 select-none transition-all duration-300 ease-in-out",
					isPinned
						? "inset-y-0"
						: "top-12 bottom-12 rounded-r-2xl border-y border-r border-foreground/10 shadow-2xl",
					!isVisible && "-translate-x-full",
					isVisible && "translate-x-0",
					isPinned && "border-r border-foreground/5 shadow-none",
				)}
			>
				{/* Top Section: Workspace Switcher */}
				<div className="mb-4">
					<UserMenuMinimal
						session={session}
						activeOrg={activeOrg}
						orgs={orgs}
						displayName={displayName}
						getInitials={getInitials}
						setActiveOrgMutation={setActiveOrgMutation}
						signOutMutation={signOutMutation}
						router={router}
						togglePin={togglePin}
					/>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-6 relative overflow-y-auto no-scrollbar">
					<div className="space-y-0.5 px-1">
						<SidebarItem
							label="Search"
							onClick={togglePalette}
							prefix={<Search className="h-4 w-4" />}
						/>
						<SidebarItem
							label="Home"
							to="/dashboard"
							isActive={location.pathname === "/dashboard"}
							prefix={<Home className="h-4 w-4" />}
						/>
						<SidebarItem
							label="Inbox"
							onClick={() => setIsInboxOpen(!isInboxOpen)}
							isActive={isInboxOpen}
							prefix={<Inbox className="h-4 w-4" />}
						/>
						<SidebarItem
							label="Members"
							to="/settings/members"
							isActive={location.pathname === "/settings/members"}
							prefix={<Users className="h-4 w-4" />}
						/>
						{invitations && pendingCount > 0 && (
							<SidebarItem
								label={`Invitations (${pendingCount})`}
								to="/accept-invite"
								isActive={location.pathname === "/accept-invite"}
								prefix={<Bell className="h-4 w-4" />}
							/>
						)}
					</div>

					<SidebarWorkspacesMinimal activeOrgId={activeOrg?.id} />
				</nav>

				{/* Bottom Section */}
				<div className="mt-auto pt-4 flex flex-col gap-0.5 px-1">
					<SidebarItem
						label="Settings"
						onClick={() => {
							router.navigate({
								to: "/settings",
							});
						}}
						isActive={
							location.pathname.startsWith("/settings") &&
							!location.pathname.includes("/members")
						}
						prefix={<Settings className="h-4 w-4" />}
					/>
					<SidebarItem
						label="Marketplace"
						prefix={<LayoutGrid className="h-4 w-4" />}
					/>
					<SidebarItem
						label="Trash"
						onClick={() => setTrashDialogOpen(true)}
						prefix={<Trash2 className="h-4 w-4" />}
					/>

					<div className="h-px bg-foreground/5 my-2" />

					<button
						type="button"
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-all group w-full"
					>
						<div className="flex items-center justify-center shrink-0">
							{theme === "dark" ? (
								<Sun className="h-4 w-4" />
							) : (
								<Moon className="h-4 w-4" />
							)}
						</div>
						<span className="text-[12px] font-medium tracking-tight">
							{theme === "dark" ? "Light mode" : "Dark mode"}
						</span>
					</button>
				</div>
			</div>

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
								if (activeOrg) {
									createWorkspaceLocal(activeOrg.id, "Collection")
										.then((workspace) => {
											router.navigate({
												to: "/workspace/$workspaceId",
												params: { workspaceId: workspace.id },
											});
										})
										.catch(console.error);
								}
								setIsPaletteOpen(false);
							}}
						>
							<Plus className="mr-2 h-4 w-4" />
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
								router.navigate({ to: "/settings" });
								setIsPaletteOpen(false);
							}}
						>
							<Settings className="mr-2 h-4 w-4" />
							<span>Go to settings</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>

			{/* Trash Dialog */}
			<TrashDialog
				open={trashDialogOpen}
				onOpenChange={setTrashDialogOpen}
				activeOrgId={activeOrg?.id}
			/>
		</>
	);
}

// Trash Dialog Component
function TrashDialog({
	open,
	onOpenChange,
	activeOrgId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	activeOrgId?: string;
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const { data: archivedFormsData } = useArchivedForms();
	const { data: workspacesData } = useWorkspaces();

	// Get archived forms filtered by active organization
	const archivedForms = useMemo(() => {
		if (!activeOrgId || !archivedFormsData || !workspacesData) return [];

		// Get workspace IDs belonging to active org
		const orgWorkspaceIds = new Set(
			workspacesData
				.filter((ws) => ws.organizationId === activeOrgId)
				.map((ws) => ws.id),
		);

		// Filter forms that belong to org's workspaces
		return archivedFormsData
			.filter((form) => orgWorkspaceIds.has(form.workspaceId))
			.filter(
				(form) =>
					!searchQuery ||
					form.title.toLowerCase().includes(searchQuery.toLowerCase()),
			)
			.sort(
				(a, b) =>
					new Date(b.deletedAt || b.updatedAt).getTime() -
					new Date(a.deletedAt || a.updatedAt).getTime(),
			);
	}, [archivedFormsData, workspacesData, activeOrgId, searchQuery]);

	// Create a map of workspace names
	const workspaceNames = useMemo(() => {
		if (!workspacesData) return {};
		return workspacesData.reduce(
			(acc, ws) => {
				acc[ws.id] = ws.name;
				return acc;
			},
			{} as Record<string, string>,
		);
	}, [workspacesData]);

	const handleRestore = async (formId: string) => {
		try {
			await restoreFormLocal(formId);
		} catch (error) {
			console.error("Failed to restore form:", error);
		}
	};

	const handlePermanentDelete = async (formId: string) => {
		try {
			await permanentDeleteFormLocal(formId);
		} catch (error) {
			console.error("Failed to delete form:", error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-background border-foreground/10">
				{/* Search Input */}
				<div className="p-3 border-b border-foreground/5">
					<Input
						placeholder="Search pages in Trash"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-9 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20"
					/>
				</div>

				{/* Forms List */}
				<div className="max-h-[400px] overflow-y-auto">
					{archivedForms.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Trash2 className="h-10 w-10 mb-3 opacity-30" />
							<p className="text-sm">Trash is empty</p>
						</div>
					) : (
						<div className="p-1">
							{archivedForms.map((form) => (
								<div
									key={form.id}
									className="group flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-md transition-colors"
								>
									<div className="flex items-center gap-3 min-w-0 flex-1">
										<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
										<div className="min-w-0 flex-1">
											<p className="text-[13px] font-medium text-foreground truncate">
												{form.title || "Untitled"}
											</p>
											<p className="text-[11px] text-muted-foreground/60 truncate">
												{workspaceNames[form.workspaceId] ||
													"Unknown workspace"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											onClick={() => handleRestore(form.id)}
											className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="Restore"
										>
											<Undo2 className="h-4 w-4" />
										</button>
										<button
											type="button"
											onClick={() => handlePermanentDelete(form.id)}
											className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
											title="Delete permanently"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between px-4 py-3 border-t border-foreground/5 bg-muted/20">
					<p className="text-[11px] text-muted-foreground/60">
						Pages in Trash for over 30 days will be automatically deleted
					</p>
					<button
						type="button"
						className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
					>
						<HelpCircle className="h-4 w-4" />
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// Sidebar Inbox Panel Component
function SidebarInbox() {
	const { isInboxOpen, setIsInboxOpen, isPinned, isVisible } =
		useMinimalSidebar();

	if (!isInboxOpen) return null;

	return (
		<div
			className={cn(
				"fixed z-40 flex w-80 flex-col bg-background select-none transition-all duration-300 ease-in-out border-r border-foreground/5 top-0 bottom-0",
				isPinned ? "left-56" : "left-0",
				// The inbox should stay visible if it's open, but we handle the transition if the main sidebar collapses
				!isPinned && !isVisible && "opacity-100",
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-4 h-10 border-b border-foreground/5">
				<div className="flex items-center gap-2">
					<h2 className="text-[13px] font-bold text-foreground">Inbox</h2>
				</div>
				<div className="flex items-center gap-0.5">
					<button
						type="button"
						onClick={() => setIsInboxOpen(false)}
						className="p-1 px-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1"
						title="Collapse"
					>
						<ChevronsLeft className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
					>
						<Filter className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
					>
						<MoreHorizontal className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-2 no-scrollbar">
				<div className="px-1 overflow-hidden">
					<p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-3 px-2">
						Older
					</p>

					<div className="space-y-1">
						{/* Notification Item 1 */}
						<div className="group flex flex-col gap-1 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-foreground/5">
							<div className="flex items-start gap-3">
								<div className="h-8 w-8 rounded bg-foreground/5 flex items-center justify-center shrink-0">
									<span className="text-xs font-bold">S</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<p className="text-[13px] font-bold text-foreground leading-tight truncate">
											SMART TECH requested access to{" "}
											<span className="text-red-500">📕 Betting Platform</span>
										</p>
										<span className="text-[10px] text-muted-foreground/30 whitespace-nowrap">
											12/08
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground/50 mt-1">
										Approved by You on Dec 8, 2025
									</p>
								</div>
							</div>
						</div>

						{/* Notification Item 2 */}
						<div className="group flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-foreground/5">
							<div className="h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center shrink-0">
								<span className="text-xs font-bold text-muted-foreground/40">
									B
								</span>
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<p className="text-[12px] font-medium text-foreground truncate">
										Basky & Velu invited you to{" "}
										<span className="font-bold">🕵️ I'm Vijay</span>
									</p>
									<span className="text-[10px] text-muted-foreground/30 whitespace-nowrap">
										10/22
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// User Menu Component (Minimal Style - Workspace Switcher)
function UserMenuMinimal({
	session,
	activeOrg,
	orgs,
	displayName,
	getInitials,
	setActiveOrgMutation,
	signOutMutation,
	router,
	togglePin,
}: {
	session: any;
	activeOrg: any;
	orgs: any;
	displayName: string;
	getInitials: (name?: string | null) => string;
	setActiveOrgMutation: any;
	signOutMutation: any;
	router: any;
	togglePin: () => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	// Close menu when clicking outside
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest(".user-menu-container")) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div className="relative user-menu-container px-1">
			<div className="flex items-center justify-between group/header">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors flex-1 min-w-0"
					aria-label="Toggle user menu"
				>
					<div className="h-5.5 w-5.5 rounded bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
						{getInitials(displayName)}
					</div>
					<span className="text-[13px] font-semibold text-foreground truncate flex-1">
						{displayName}
					</span>
					<ChevronDown
						className={cn(
							"h-3 w-3 text-muted-foreground/30 transition-transform duration-200 shrink-0",
							isOpen && "rotate-180 text-foreground",
						)}
					/>
				</button>
				<div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
					<button
						type="button"
						onClick={togglePin}
						className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						title="Collapse sidebar"
					>
						<ChevronsLeft className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
					>
						<PencilLine className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{isOpen && (
				<div className="absolute top-full left-0 right-0 mt-1 bg-background border border-foreground/10 rounded-xl shadow-2xl p-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 min-w-[240px]">
					{/* Active Workspace Info */}
					<div className="px-3 py-2 border-b border-foreground/5 mb-1.5 flex items-start gap-3">
						<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold shrink-0">
							{getInitials(displayName)}
						</div>
						<div className="flex flex-col min-w-0">
							<span className="text-[14px] font-bold text-foreground truncate">
								{displayName}
							</span>
							<span className="text-[11px] text-muted-foreground/60">
								Free Plan · 1 member
							</span>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="grid grid-cols-2 gap-1 mb-2 px-1">
						<button
							type="button"
							onClick={() => {
								router.navigate({ to: "/settings" });
								setIsOpen(false);
							}}
							className="flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-foreground/5 hover:bg-muted/50 text-[11px] font-medium transition-colors"
						>
							<Settings className="h-3 w-3" />
							Settings
						</button>
						<button
							type="button"
							className="flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-foreground/5 hover:bg-muted/50 text-[11px] font-medium transition-colors"
						>
							<UserPlus className="h-3 w-3" />
							Invite members
						</button>
					</div>

					{/* Team Switcher */}
					<div className="px-2 py-1 mb-1.5">
						<p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest px-1 mb-1">
							{session?.user?.email}
						</p>
						<div className="space-y-0.5">
							{orgs?.map((org: any) => (
								<button
									type="button"
									key={org.id}
									onClick={() => {
										setActiveOrgMutation.mutate({ organizationId: org.id });
										setIsOpen(false);
									}}
									className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
									aria-label={`Switch to ${org.name}`}
								>
									<div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[9px] font-bold">
										{getInitials(org.name)}
									</div>
									<span className="text-[13px] font-medium flex-1 truncate">
										{org.name}
									</span>
									{org.id === activeOrg?.id && (
										<div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
									)}
								</button>
							))}
							<button
								type="button"
								className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 text-[13px] text-muted-foreground hover:text-foreground transition-colors text-left"
							>
								<Plus className="h-4 w-4" />
								<span>New workspace</span>
							</button>
						</div>
					</div>

					{/* Footer Actions */}
					<div className="h-px bg-foreground/5 my-1" />
					<div className="space-y-0.5 px-1">
						<button
							type="button"
							className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors text-left"
						>
							<Plus className="h-3.5 w-3.5" />
							<span>Add another account</span>
						</button>
						<button
							type="button"
							onClick={() => {
								signOutMutation.mutate({});
								setIsOpen(false);
							}}
							className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors text-left"
						>
							<LogOut className="h-3.5 w-3.5" />
							<span>Log out</span>
						</button>
					</div>
				</div>
			)}
		</div>
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

// Minimal Workspace Item Component
function WorkspaceItemMinimal({
	workspace,
	onRename,
	onDelete,
}: {
	workspace: WorkspaceWithForms;
	onRename: () => void;
	onDelete: () => void;
}) {
	const [isOpen, setIsOpen] = useState(true);
	const [showMenu, setShowMenu] = useState(false);

	// Close menu when clicking outside
	useEffect(() => {
		if (!showMenu) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest(".workspace-menu-container")) {
				setShowMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showMenu]);

	return (
		<div className="flex flex-col">
			<SidebarItem label={workspace.name} onClick={() => setIsOpen(!isOpen)}>
				<div className="flex items-center gap-1">
					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<div className="relative workspace-menu-container">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setShowMenu(!showMenu);
								}}
								className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
								title="More options"
							>
								<MoreHorizontal className="h-3 w-3" />
							</button>
							{showMenu && (
								<div className="absolute right-0 top-full mt-1 bg-background border border-foreground/10 rounded-lg shadow-lg p-1 z-50 min-w-32">
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onRename();
											setShowMenu(false);
										}}
										className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors text-left font-medium"
									>
										<Pencil className="h-3.5 w-3.5" />
										<span>Rename</span>
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onDelete();
											setShowMenu(false);
										}}
										className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded transition-colors text-left font-medium"
									>
										<Trash2 className="h-3.5 w-3.5" />
										<span>Delete</span>
									</button>
								</div>
							)}
						</div>
					</div>
					{isOpen ? (
						<ChevronDown className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
					) : (
						<ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
					)}
				</div>
			</SidebarItem>

			{isOpen && (
				<div className="ml-3 flex flex-col border-l border-foreground/5 mt-0.5 pl-3.5 relative">
					{workspace.forms.map((form) => (
						<WorkspaceFormMinimal
							key={form.id}
							label={form.title || "Untitled"}
							to={`/workspace/${workspace.id}/form-builder/${form.id}/edit`}
						/>
					))}
					{workspace.forms.length === 0 && (
						<span className="text-muted-foreground/50 text-[11px] px-2 py-1">
							No forms yet
						</span>
					)}
				</div>
			)}
		</div>
	);
}

function WorkspaceFormMinimal({ label, to }: { label: string; to?: string }) {
	const location = useLocation();
	return (
		<SidebarItem
			label={label}
			to={to}
			isNested
			isActive={location.pathname === to}
		/>
	);
}

// Sidebar Section Component
function SidebarSection({
	label,
	children,
	action,
	initialOpen = true,
}: {
	label: string;
	children: React.ReactNode;
	action?: React.ReactNode;
	initialOpen?: boolean;
}) {
	const [isOpen, setIsOpen] = useState(initialOpen);

	return (
		<div className="space-y-1">
			<div className="group flex items-center justify-between px-2 py-1 transition-colors">
				<button
					type="button"
					className="flex items-center gap-1.5 cursor-pointer flex-1"
					onClick={() => setIsOpen(!isOpen)}
					aria-expanded={isOpen}
				>
					{isOpen ? (
						<ChevronDown className="h-3 w-3 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
					) : (
						<ChevronRight className="h-3 w-3 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
					)}
					<span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-wider group-hover:text-muted-foreground/60 transition-colors">
						{label}
					</span>
				</button>
				{action}
			</div>
			{isOpen && <div className="space-y-0.5">{children}</div>}
		</div>
	);
}

// Workspaces section - uses live queries for real-time sync (Minimal Style)
function SidebarWorkspacesMinimal({ activeOrgId }: { activeOrgId?: string }) {
	const router = useRouter();
	const { data: session } = useSession();

	// Use live queries for real-time sync
	const { data: workspacesData, isLoading: workspacesLoading } =
		useWorkspaces();
	const { data: formsData, isLoading: formsLoading } = useForms();

	// Get user's favorite forms
	const favoriteForms = useFavoriteForms(session?.user?.id);

	// Determine if Electric has synced
	const isLoading = workspacesLoading || formsLoading;
	const isElectricReady =
		!isLoading && workspacesData !== undefined && formsData !== undefined;

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
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				),
			}));
	}, [workspacesData, formsData, activeOrgId, isElectricReady]);
	// State for dialogs
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [workspaceToDelete, setWorkspaceToDelete] =
		useState<WorkspaceWithForms | null>(null);
	const [deleteConfirmName, setDeleteConfirmName] = useState("");
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [workspaceToRename, setWorkspaceToRename] =
		useState<WorkspaceWithForms | null>(null);
	const [newWorkspaceName, setNewWorkspaceName] = useState("");

	const handleCreateWorkspace = async () => {
		if (!activeOrgId) return;
		try {
			const workspace = await createWorkspaceLocal(activeOrgId, "Collection");
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
			<div className="space-y-6">
				{/* Favorites Section */}
				<SidebarSection
					label="Favorites"
					initialOpen={favoriteForms.length > 0}
					action={
						<button
							type="button"
							className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						>
							<MoreHorizontal className="h-3 w-3" />
						</button>
					}
				>
					{favoriteForms.length === 0 ? (
						<span className="text-muted-foreground/30 text-[11px] px-2 py-1 italic">
							No favorites yet
						</span>
					) : (
						favoriteForms.map((form) => (
							<Link
								key={form.id}
								to="/workspace/$workspaceId/form-builder/$formId"
								params={{ workspaceId: form.workspaceId, formId: form.id }}
								className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-muted-foreground/80 hover:text-foreground rounded transition-colors"
							>
								<FileText className="h-3.5 w-3.5 shrink-0" />
								<span className="truncate">{form.title || "Untitled"}</span>
							</Link>
						))
					)}
				</SidebarSection>

				{/* Collections (formerly Workspaces) Section */}
				<SidebarSection
					label="Collections"
					action={
						<button
							type="button"
							onClick={handleCreateWorkspace}
							className="h-3.5 w-3.5 cursor-pointer hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
						>
							<Plus className="h-3.5 w-3.5" />
						</button>
					}
				>
					{isLoading ? (
						["collection-skeleton-1", "collection-skeleton-2"].map((key) => (
							<div key={key} className="flex items-center gap-2 px-2 py-1.5">
								<div className="h-4 w-4 rounded bg-muted animate-pulse" />
								<div className="h-4 flex-1 rounded bg-muted animate-pulse" />
							</div>
						))
					) : (
						<>
							{workspaces.map((workspace) => (
								<WorkspaceItemMinimal
									key={workspace.id}
									workspace={workspace}
									onRename={() => openRenameDialog(workspace)}
									onDelete={() => openDeleteDialog(workspace)}
								/>
							))}
							{workspaces.length === 0 && (
								<span className="text-muted-foreground/50 text-[11px] px-2 py-1">
									No collections yet
								</span>
							)}
						</>
					)}
				</SidebarSection>
			</div>

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
