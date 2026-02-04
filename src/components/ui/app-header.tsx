import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Folder,
  History,
  LayoutGrid,
  Loader2,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  Search,
  Settings,
  Share,
  Star,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth";
import { VersionHistoryDialog } from "@/components/form-builder/version-history-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMinimalSidebarSafe } from "@/contexts/minimal-sidebar-context";
import { toggleFavoriteLocal } from "@/db-collections";
import { useCommandPalette } from "@/hooks/use-command-palette";
import {
  useDiscardChanges,
  useHasUnpublishedChanges,
  usePublishVersion,
} from "@/hooks/use-form-versions";
import { useForm, useIsFavorite, useWorkspace } from "@/hooks/use-live-hooks";
import { auth, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { SidebarTrigger, useSidebarSafe } from "./sidebar";

interface AppHeaderProps {
  formId?: string;
  workspaceId?: string;
}

// Client-only component for displaying form title from local DB
function FormTitleDisplay({ formId }: { formId: string }) {
  const { data: savedDocs } = useForm(formId);
  return <>{savedDocs?.[0]?.title || "Untitled"}</>;
}

// Client-only component for displaying workspace name from local DB
function WorkspaceNameDisplay({ workspaceId }: { workspaceId: string }) {
  const { data: workspace } = useWorkspace(workspaceId);
  return <>{workspace?.name || "Workspace"}</>;
}

export function AppHeader({ formId, workspaceId }: AppHeaderProps) {
  const sidebarContext = useSidebarSafe();
  const minimalSidebar = useMinimalSidebarSafe();
  const isPinned = minimalSidebar?.isPinned ?? true;
  const togglePin = minimalSidebar?.togglePin || (() => {});
  const setIsHovered = minimalSidebar?.setIsHovered || (() => {});

  const state = sidebarContext?.state;
  const { pathname } = useLocation();
  const isWorkspaceDashboard =
    pathname.startsWith("/workspace/") && !pathname.includes("/form-builder/");
  const isFormBuilder = pathname.startsWith("/form-builder") || pathname.includes("/form-builder/");
  const _isCreateRoute = pathname === "/create";
  const { data: sessionData } = useSession();
  const session = sessionData;
  const navigate = useNavigate();

  // Version history dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Get search params for the current route
  const search: any = useSearch({ strict: false });
  const demo = search.demo;
  const { setIsOpen: setIsPaletteOpen } = useCommandPalette();

  // Get current form metadata for publishing
  const { data: savedDocs } = useForm(formId);
  const currentForm = savedDocs?.[0];

  // Version management hooks
  const hasUnpublishedChanges = useHasUnpublishedChanges(formId);
  const publishMutation = usePublishVersion();
  const discardMutation = useDiscardChanges();

  // Favorite state
  const isFavorite = useIsFavorite(session?.user?.id, formId);

  const handleToggleFavorite = async () => {
    if (!session?.user?.id || !formId) return;
    await toggleFavoriteLocal(session.user.id, formId);
  };

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        toast.success("Signed out successfully");
        navigate({ to: "/" });
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
        const result = (await publishMutation.mutateAsync(formId)) as {
          versionNumber: number;
        };
        toast.success(`Form published as version ${result.versionNumber}`);
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

  const handleDiscardChanges = async () => {
    if (formId) {
      try {
        await discardMutation.mutateAsync(formId);
        toast.info("Changes discarded, reverted to last published version");
      } catch (error) {
        toast.error("Failed to discard changes");
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
    <header className="flex h-10 w-full items-center justify-between border-b border-foreground/5 bg-background px-3 text-[13px] font-medium shrink-0 select-none">
      {/* Left Section: Breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {state === "collapsed" && (
          <div className="mr-1">
            <SidebarTrigger />
          </div>
        )}
        {!isPinned && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground -ml-1"
            onClick={togglePin}
            onMouseEnter={() => setIsHovered(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {isFormBuilder || isWorkspaceDashboard ? (
            <Breadcrumb className="flex items-center">
              <BreadcrumbList className="flex items-center gap-1">
                <BreadcrumbItem className="flex items-center">
                  <BreadcrumbLink asChild>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors py-1"
                    >
                      <img src="/timeless.png" alt="BetterForms" className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <div className="flex items-center justify-center p-0.5 opacity-20 rotate-12">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <BreadcrumbItem className="flex items-center">
                  {isFormBuilder ? (
                    <BreadcrumbLink asChild>
                      {workspaceId ? (
                        <Link
                          to="/workspace/$workspaceId"
                          params={{ workspaceId }}
                          className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors py-1"
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          <span className="leading-none mb-0.5">
                            <WorkspaceNameDisplay workspaceId={workspaceId} />
                          </span>
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground/60 py-1">
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          <span className="leading-none mb-0.5">My workspace</span>
                        </span>
                      )}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="flex items-center gap-1.5 text-foreground font-semibold py-1">
                      <Folder className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none mb-0.5">
                        <WorkspaceNameDisplay workspaceId={workspaceId || ""} />
                      </span>
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>

                {isFormBuilder && (
                  <>
                    <div className="flex items-center justify-center p-0.5 opacity-20 rotate-12">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <BreadcrumbItem className="flex items-center">
                      <BreadcrumbPage className="flex items-center gap-1.5 text-foreground font-semibold py-1">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="leading-none mb-0.5 truncate">
                          {formId ? <FormTitleDisplay formId={formId} /> : "Untitled"}
                        </span>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          ) : (
            <Link
              to="/"
              className={cn("flex items-center gap-2", state === "collapsed" ? "pl-2" : "pl-0")}
            >
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              <span className="text-foreground font-bold tracking-tight">BetterForms</span>
            </Link>
          )}
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1">
        {isFormBuilder && currentForm?.updatedAt && (
          <span className="text-[11px] text-muted-foreground/40 mr-2 whitespace-nowrap">
            Edited {formatDistanceToNow(new Date(currentForm.updatedAt))} ago
          </span>
        )}

        {(isFormBuilder || isWorkspaceDashboard) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsPaletteOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (⌘K)</TooltipContent>
          </Tooltip>
        )}

        {isFormBuilder ? (
          <>
            {/* Changes indicator - shows when there are unpublished changes */}
            {hasUnpublishedChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                    onClick={handleDiscardChanges}
                    disabled={discardMutation.isPending}
                  >
                    {discardMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Changes
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Click to discard changes</p>
                  <p className="text-xs text-muted-foreground">
                    Changes are auto-saved, but not published yet
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* History button - opens version history dialog */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
                  onClick={() => setHistoryDialogOpen(true)}
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Version History</TooltipContent>
            </Tooltip>

            {formId && workspaceId && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link
                        to="/workspace/$workspaceId/form-builder/$formId/submissions"
                        params={{
                          formId: formId,
                          workspaceId: workspaceId,
                        }}
                      >
                        <Database className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Submissions</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link
                        to="/workspace/$workspaceId/form-builder/$formId/share"
                        params={{
                          formId: formId,
                          workspaceId: workspaceId,
                        }}
                      >
                        <Share className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>

							</>
						)}

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
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5 hover:bg-muted/50">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
                      <AvatarFallback className="text-[9px] bg-blue-100 text-blue-600">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 text-muted-foreground/30" />
                  </Button>
                </DropdownMenuTrigger>
                {/* ... Dropdown content remains same ... */}
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings/my-account">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings/my-account" className="flex items-center gap-2">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleToggleFavorite}
                >
                  <Star
                    className={cn("h-3.5 w-3.5", isFavorite && "fill-yellow-400 text-yellow-400")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFavorite ? "Remove from favorites" : "Add to favorites"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              className="h-7 px-3 bg-blue-600 hover:bg-blue-700 ml-1 text-white text-[11px] font-semibold"
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {hasUnpublishedChanges ? "Publish Changes" : "Publish"}
            </Button>

            {/* Version History Dialog */}
            {formId && (
              <VersionHistoryDialog
                formId={formId}
                open={historyDialogOpen}
                onOpenChange={setHistoryDialogOpen}
              />
            )}
          </>
        ) : (
          <>
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
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
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to="/settings/my-account">
                    <DropdownMenuItem asChild>
                      <div className="flex items-center gap-2">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
            {!session && (
              <AuthDialog defaultMode="sign-up">
                <Button size="sm" className="h-8 px-4 bg-blue-600 hover:bg-blue-700 ml-2">
                  Create a new form
                </Button>
              </AuthDialog>
            )}
          </>
        )}
      </div>
    </header>
  );
}
