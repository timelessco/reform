import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch, useNavigate } from "@tanstack/react-router";
import { Flower2, History, LayoutGrid, LogOut, Search, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useCustomizeSidebar } from "@/hooks/use-customize-sidebar";
import { auth, useSession } from "@/lib/auth-client";
import { SidebarTrigger, useSidebarSafe } from "./sidebar";
import { useForm, useWorkspace } from "@/hooks/use-live-hooks";
import { updateFormStatus } from "@/db-collections";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { ClientOnly } from "@/components/client-only";

interface AppHeaderProps {
	formId?: string;
	workspaceId?: string;
}

// Client-only component for displaying form title from local DB
function FormTitleDisplay({ formId }: { formId: string }) {
	const savedDocs = useForm(formId);
	return <>{savedDocs?.[0]?.title || "Untitled"}</>;
}

// Client-only component for displaying workspace name from local DB
function WorkspaceNameDisplay({ workspaceId }: { workspaceId: string }) {
	const workspace = useWorkspace(workspaceId);
	return <>{workspace?.name || "Workspace"}</>;
}

export function AppHeader({ formId, workspaceId }: AppHeaderProps) {
	const sidebarContext = useSidebarSafe();
	const state = sidebarContext?.state;
	const { pathname } = useLocation();
	const isWorkspaceDashboard =
		pathname.startsWith("/workspace/") && !pathname.includes("/form-builder/");
	const isFormBuilder =
		pathname.startsWith("/form-builder") || pathname.includes("/form-builder/");
	const isCreateRoute = pathname === "/create";
	const { data: sessionData } = useSession();
	const session = sessionData;
	const navigate = useNavigate();
	const isUnverified = session && !session.user.emailVerified;


	// Get search params for the current route
	const search: any = useSearch({ strict: false });
	const demo = search.demo;
	const { toggle } = useCustomizeSidebar();
	const { setIsOpen: setIsPaletteOpen } = useCommandPalette();

	// Get current form metadata for publishing
	const savedDocs = useForm(formId);
	const currentForm = savedDocs?.[0];
	const isPublished = currentForm?.status === "published";

	const signOutMutation = useMutation(
		auth.signOut.mutationOptions({
			onSuccess: () => {
				toast.success("Signed out successfully");
			},
			onError: (error) => {
				toast.error("Failed to sign out");
				console.error(error);
			},
		}),
	);

	const handleSignOut = async () => {
		signOutMutation.mutate({});
	};

	const handlePublish = async () => {
		if (formId && workspaceId) {
			try {
				await updateFormStatus(formId, "published");
				toast.success("Form published successfully");
				// Redirect to the share page
				navigate({
					to: "/workspace/$workspaceId/form-builder/$formId/share",
					params: { workspaceId, formId },
				});
			} catch (error) {
				toast.error("Failed to publish form");
				console.error(error);
			}
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<header className="flex h-12 w-full items-center justify-between border-b bg-background px-4 text-sm font-medium shrink-0">
			{/* Left Section: Breadcrumbs */}
			{state === "collapsed" && (
				<div className="absolute top-2 left-2 z-50">
					<SidebarTrigger />
				</div>
			)}
			<div className="flex items-center gap-4">
				{isFormBuilder || isWorkspaceDashboard ? (
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link to="/dashboard" className="flex items-center gap-1">
										<LayoutGrid className="h-4 w-4 text-muted-foreground/60" />
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{isFormBuilder ? (
									<BreadcrumbLink asChild>
										{workspaceId ? (
											<Link
												to="/workspace/$workspaceId"
												params={{ workspaceId }}
											>
												<ClientOnly fallback="Workspace">
													<WorkspaceNameDisplay workspaceId={workspaceId} />
												</ClientOnly>
											</Link>
										) : (
											<Link to="/dashboard">My workspace</Link>
										)}
									</BreadcrumbLink>
								) : (
									<BreadcrumbPage>
										<ClientOnly fallback="Workspace">
											<WorkspaceNameDisplay
												workspaceId={workspaceId || ""}
											/>
										</ClientOnly>
									</BreadcrumbPage>
								)}
							</BreadcrumbItem>
							{isFormBuilder && (
								<>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbPage className="flex items-center gap-2">
											{formId ? (
												<ClientOnly fallback="Loading...">
													<FormTitleDisplay formId={formId} />
												</ClientOnly>
											) : (
												"Untitled"
											)}
										</BreadcrumbPage>
									</BreadcrumbItem>
								</>
							)}
						</BreadcrumbList>
					</Breadcrumb>
				) : (
					<Link to="/" className="flex items-center gap-2">
						<Flower2 className="h-5 w-5 text-blue-600" />
						<span className="text-foreground font-bold tracking-tight">Better Forms</span>
					</Link>
				)}
			</div>

			{/* Right Section: Actions */}
			<div className="flex items-center gap-2">
				{isFormBuilder && (
					<Badge
						variant="secondary"
						className={`text-[10px] h-5 px-1.5 font-normal ${isPublished
							? "bg-green-100 text-green-700"
							: "bg-muted text-muted-foreground"
							} mr-2`}
					>
						{isPublished ? "Published" : "Draft"}
					</Badge>
				)}

				{(isFormBuilder || isWorkspaceDashboard) && (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted font-normal transition-colors"
						onClick={() => setIsPaletteOpen(true)}
					>
						<Search className="h-4 w-4" />
						<span className="hidden sm:inline">Search</span>
					</Button>
				)}

				{isFormBuilder ? (
					<>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
						>
							<History className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							asChild
						>
							<Link to="/settings/my-account">
								<Settings className="h-4 w-4" />
							</Link>
						</Button>

						<Separator orientation="vertical" className="mx-2 h-4" />
						<Button
							variant="ghost"
							asChild
							size="sm"
							className="h-8 text-muted-foreground font-normal hover:text-foreground"
						>
							<Link to="." search={{ demo: !demo } as any}>
								Demo
							</Link>
						</Button>
						{/* Text Actions */}
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-muted-foreground font-normal hover:text-foreground"
							onClick={() => toggle()}
						>
							Customize
						</Button>
						{session ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
										<Avatar className="h-6 w-6">
											<AvatarImage
												src={session.user.image || undefined}
												alt={session.user.name}
											/>
											<AvatarFallback className="text-xs">
												{getInitials(session.user.name)}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm font-normal hidden sm:inline">
											{session.user.name}
										</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel>
										<div className="flex flex-col space-y-1">
											<p className="text-sm font-medium">{session.user.name}</p>
											<p className="text-xs text-muted-foreground">
												{session.user.email}
											</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link to="/settings/my-account">
											<User className="mr-2 h-4 w-4" />
											Profile
										</Link>
										{isUnverified && (
											<Badge
												variant="destructive"
												className="ml-auto text-[10px] h-4 px-1"
											>
												Unverified
											</Badge>
										)}
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link
											to="/settings/my-account"
											className="flex items-center gap-2"
										>
											<Settings className="mr-2 h-4 w-4" />
											Settings
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={handleSignOut}
										className="text-destructive"
									>
										<LogOut className="mr-2 h-4 w-4" />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<AuthDialog defaultMode="sign-up">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 text-blue-600 font-normal hover:text-blue-700 hover:bg-blue-50"
								>
									Sign up
								</Button>
							</AuthDialog>
						)}
						{/* Primary Action */}
						<Button
							size="sm"
							className={`h-8 px-4 ${isPublished
								? "bg-green-600 hover:bg-green-700"
								: "bg-blue-600 hover:bg-blue-700"
								} ml-2 text-white`}
							onClick={handlePublish}
							disabled={isPublished}
						>
							{isPublished ? "Published" : "Publish"}
						</Button>
					</>
				) : (
					<>
						{session ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
										<Avatar className="h-6 w-6">
											<AvatarImage
												src={session.user.image || undefined}
												alt={session.user.name}
											/>
											<AvatarFallback className="text-xs">
												{getInitials(session.user.name)}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm font-normal hidden sm:inline">
											{session.user.name}
										</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel>
										<div className="flex flex-col space-y-1">
											<p className="text-sm font-medium">{session.user.name}</p>
											<p className="text-xs text-muted-foreground">
												{session.user.email}
											</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<Link to="/settings/my-account">
										<DropdownMenuItem asChild>
											<div className="flex items-center gap-2">
												<User className="mr-2 h-4 w-4" />
												Profile
												{isUnverified && (
													<Badge
														variant="destructive"
														className="ml-auto text-[10px] h-4 px-1"
													>
														Unverified
													</Badge>
												)}
											</div>
										</DropdownMenuItem>
									</Link>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={handleSignOut}
										className="text-destructive"
									>
										<LogOut className="mr-2 h-4 w-4" />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<AuthDialog defaultMode="sign-in">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 text-muted-foreground font-normal hover:text-foreground"
								>
									Sign in
								</Button>
							</AuthDialog>
						)}
						{!isCreateRoute && (
							<Button
								size="sm"
								className="h-8 px-4 bg-blue-600 hover:bg-blue-700 ml-2"
								asChild
								disabled={!!isUnverified}
							>
								<Link to={isUnverified ? "/verify-email" : "/dashboard"}>
									{isUnverified ? "Verify Email" : "Create Form"}
								</Link>
							</Button>
						)}
					</>
				)}
			</div>
		</header>
	);
}
