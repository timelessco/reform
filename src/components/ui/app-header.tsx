import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleFavoriteLocal, updateFormStatus } from "@/db-collections";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import {
  discardChangesAction,
  publishFormAction,
  useHasUnpublishedChanges,
} from "@/hooks/use-form-versions";
import { useForm, useIsFavorite, useWorkspace } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { cn, parseTimestampAsUTC } from "@/lib/utils";
import { Link, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ChevronsRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSidebarSafe } from "./sidebar";

interface AppHeaderProps {
  dividerX?: number;
  isSidebarOpen?: boolean;
  isDistractionHidden?: boolean;
}

export function AppHeader({
  dividerX,
  isSidebarOpen,
  isDistractionHidden = false,
}: AppHeaderProps) {
  const { formId, workspaceId } = useParams({ strict: false }) as { formId?: string; workspaceId?: string };
  const { state, toggleSidebar: toggleMainSidebar } = useSidebarSafe() || {
    state: "expanded",
    toggleSidebar: () => { },
  };
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";
  const isFormBuilder = pathname.startsWith("/form-builder") || pathname.includes("/form-builder/");
  const isEditRoute = pathname.endsWith("/edit");
  const { data: sessionData } = useSession();
  const session = sessionData;
  const navigate = useNavigate();

  // Editor sidebar state
  const { activeSidebar, toggleSidebar, closeSidebar } = useEditorSidebar();

  const isShareSidebarOpen = activeSidebar === "share";
  const isEditorSidebarOpen = !!activeSidebar;

  const isVersionHistoryOpen = activeSidebar === "history";
  const toggleVersionHistory = () => {
    navigate({
      to: ".",
      search: (prev: any) => ({ ...prev, sidebar: isVersionHistoryOpen ? "" : "history" }),
      replace: true,
    });
  };
  const isSettingsSidebarOpen = activeSidebar === "settings";
  const toggleSettingsSidebar = () => {
    // Update URL param - the URL sync effect will handle opening/closing the sidebar
    navigate({
      to: ".",
      search: (prev: any) => ({ ...prev, sidebar: isSettingsSidebarOpen ? "" : "settings" }),
      replace: true,
    });
  };

  // Close sidebar and update URL to clear sidebar param
  const handleCloseSidebar = () => {
    closeSidebar();
    if (workspaceId && formId) {
      navigate({
        to: ".",
        search: (prev: any) => ({ ...prev, sidebar: "" }),
        replace: true,
      });
    }
  };

  const toggleShareSidebar = () => {
    // Only navigate - the URL param sync effect will handle opening/closing the sidebar
    if (workspaceId && formId) {
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: workspaceId, formId: formId },
        search: {
          demo: !isShareSidebarOpen,
          force: true,
          sidebar: isShareSidebarOpen ? "" : "share",
          embedType: "fullpage",
        },
      });
    }
  };

  const searchParams: any = useSearch({ strict: false });
  const demo = searchParams.demo;

  // Single source: Electric live data (useForm)
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: savedDocs, isLoading: isLoadingSavedDocs } = useForm(formId);
  // Version management
  const hasUnpublishedChanges = useHasUnpublishedChanges(formId);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Favorite state
  useIsFavorite(session?.user?.id, formId);

  const handleToggleFavorite = async () => {
    if (!session?.user?.id || !formId) return;
    await toggleFavoriteLocal(session.user.id, formId);
  };

  const handleDeleteForm = async () => {
    if (!formId) return;
    if (confirm("Are you sure you want to move this form to trash?")) {
      try {
        await updateFormStatus(formId, "archived");
        toast.success("Form moved to trash");
        navigate({ to: "/" });
      } catch {
        toast.error("Failed to delete form");
      }
    }
  };

  const handlePublish = async () => {
    if (formId && workspaceId) {
      try {
        const tx = publishFormAction({ formId });
        await tx.isPersisted.promise;
        toast.success("Form published");
        navigate({
          to: "/workspace/$workspaceId/form-builder/$formId/submissions",
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
      setIsDiscarding(true);
      try {
        const tx = discardChangesAction({ formId });
        await tx.isPersisted.promise;
        toast.info("Changes discarded, reverted to last published version");
      } catch (error) {
        toast.error("Failed to discard changes");
        console.error(error);
      } finally {
        setIsDiscarding(false);
      }
    }
  };

  return (
    <header
      className={cn(
        "group/header flex h-10 w-full items-center justify-between bg-background px-3 text-[13px] -z-10 font-medium shrink-0 select-none transition-opacity duration-150",
        isDistractionHidden && "opacity-0 pointer-events-none",
      )}
    >
      {/* Left Section: Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {state === "collapsed" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground -ml-1 group relative flex items-center justify-center transition-all duration-300"
            onClick={() => toggleMainSidebar()}
          >
               <span className="text-2xl font-serif italic font-light tracking-tighter text-sidebar-nav-text dark:text-dark-gray-950">f.</span>
          </Button>
        )}

        {/* Breadcrumb: Workspace / Form Name / Page */}
        {isFormBuilder && savedDocs?.[0] && (
          <div className="flex items-center gap-2 text-sm">
            {workspace && (
              <>
                <Link
                  to="/dashboard"
                  className="text-muted-foreground hover:text-foreground truncate max-w-[150px]"
                >
                  {workspace.name}
                </Link>
                <span className="text-muted-foreground/50">/</span>
              </>
            )}
            {savedDocs?.[0].status === "published" && workspaceId && formId ? (
              <Link
                to="/workspace/$workspaceId/form-builder/$formId/submissions"
                params={{ workspaceId, formId }}
                className="font-medium truncate max-w-[200px] text-foreground hover:underline"
              >
                {savedDocs?.[0].title || "Untitled"}
              </Link>
            ) : (
              <span className="font-medium truncate max-w-[200px]">
                {savedDocs?.[0].title || "Untitled"}
              </span>
            )}
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">
              {isEditRoute ? "Editor" : "Submissions"}
            </span>
          </div>
        )}
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1">
        {isFormBuilder && savedDocs?.[0]?.updatedAt && !isEditorSidebarOpen && !isLoadingSavedDocs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-muted-foreground/70 mr-2 whitespace-nowrap rounded-md bg-muted/60 px-2 py-1">
                Edited {formatDistanceToNow(parseTimestampAsUTC(savedDocs?.[0]?.updatedAt) ?? new Date())} ago
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Edited by{" "}
                  <span className="font-medium text-foreground">
                    {session?.user?.name ?? "You"}
                  </span>{" "}
                  {formatDistanceToNow(parseTimestampAsUTC(savedDocs?.[0]?.updatedAt) ?? new Date())} ago
                </p>
                {savedDocs?.[0]?.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Created by{" "}
                    <span className="font-medium text-foreground">
                      {session?.user?.name ?? "You"}
                    </span>{" "}
                    {format(parseTimestampAsUTC(savedDocs?.[0]?.createdAt) ?? new Date(), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {isDashboard && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal"
            asChild
          >
            <Link to="/">About</Link>
          </Button>
        )}

        {isFormBuilder && (
          <>
            {/* Changes indicator - shows when there are unpublished changes */}
            {hasUnpublishedChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={handleDiscardChanges}
                    disabled={isDiscarding}
                  >
                    {isDiscarding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
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

            <div className="flex items-center gap-1">
              {isEditRoute && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={cn(
                    "h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal",
                    demo && "text-foreground bg-accent/50",
                  )}
                >
                  <Link
                    to="."
                    search={(prev: any) => ({ ...prev, demo: !demo, sidebar: "" })}
                    replace
                  >
                    {demo ? "Editor" : "Preview"}
                  </Link>
                </Button>
              )}

              {savedDocs?.[0]?.status === "published" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-17 px-2.5 text-muted-foreground hover:text-foreground font-normal",
                    isShareSidebarOpen && "text-foreground bg-accent/50",
                  )}
                  onClick={toggleShareSidebar}
                >
                  Share
                </Button>
              )}

              {/* Settings icon button directly in header - toggles form settings sidebar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={toggleSettingsSidebar}
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </Button>

              {/* Three dots menu - Figma system-flat 23508:7036 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[180px] rounded-[6px] border-0 bg-white p-[6px] py-[4px] shadow-sm dark:bg-popover"
                >
                  <DropdownMenuItem
                    onClick={handleToggleFavorite}
                    className="rounded-[4px] px-3 py-2 text-[14px] font-normal tracking-[0.14px] text-sidebar-nav-text focus:bg-light-gray-100 focus:text-sidebar-nav-text dark:focus:bg-accent dark:focus:text-accent-foreground"
                  >
                    Favorite
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      workspaceId && formId && navigate({ to: "/workspace/$workspaceId/form-builder/$formId/submissions", params: { workspaceId, formId } })
                    }
                    className="rounded-[4px] px-3 py-2 text-[14px] font-normal tracking-[0.14px] text-sidebar-nav-text focus:bg-light-gray-100 focus:text-sidebar-nav-text dark:focus:bg-accent dark:focus:text-accent-foreground"
                  >
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={toggleSettingsSidebar}
                    className="rounded-[4px] px-3 py-2 text-[14px] font-normal tracking-[0.14px] text-sidebar-nav-text focus:bg-light-gray-100 focus:text-sidebar-nav-text dark:focus:bg-accent dark:focus:text-accent-foreground"
                  >
                    Customisation
                  </DropdownMenuItem>
                  {isEditRoute && (
                    <DropdownMenuItem
                      onClick={toggleVersionHistory}
                      className="rounded-[4px] px-3 py-2 text-[14px] font-normal tracking-[0.14px] text-sidebar-nav-text focus:bg-light-gray-100 focus:text-sidebar-nav-text dark:focus:bg-accent dark:focus:text-accent-foreground"
                    >
                      Version History
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleDeleteForm}
                    className="rounded-[4px] px-3 py-2 text-[14px] font-normal tracking-[0.14px] text-sidebar-nav-text focus:bg-light-gray-100 focus:text-sidebar-nav-text dark:focus:bg-accent dark:focus:text-accent-foreground"
                  >
                    Delete form
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Main Action Button */}
            {isEditRoute ? (
              // On edit route: show Publish / Publish Changes
              <Button
                size="sm"
                className={cn(
                  "h-8 px-4 ml-1 text-[13px] font-semibold transition-all rounded-md shadow-sm border-none  ",
                  !isLoadingSavedDocs &&
                    (hasUnpublishedChanges || savedDocs?.[0]?.status !== "published")
                    ? "bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                onClick={handlePublish}
                disabled={!hasUnpublishedChanges && savedDocs?.[0]?.status === "published"}
              >
                {savedDocs?.[0]?.status === "published" ? "Published" : "Publish"}
              </Button>
            ) : (
              // Not on edit route: show Edit button to navigate to the editor
              workspaceId && formId && (
                <Button
                  size="sm"
                  asChild
                  className="h-8 px-4 ml-1 text-[13px] font-semibold transition-all rounded-md shadow-sm border-none bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
                >
                  <Link
                    to="/workspace/$workspaceId/form-builder/$formId/edit"
                    params={{ workspaceId, formId }}
                    search={{ force: true }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Link>
                </Button>
              )
            )}
          </>
        )}
      </div>

      {isSidebarOpen && typeof dividerX === "number" && (
        <div className="pointer-events-none fixed top-0 h-10 z-1000" style={{ left: dividerX + 8 }}>
          <div className="pointer-events-auto absolute top-[6px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseSidebar}
                  className="h-8 w-8 bg-muted/60 opacity-0 group-hover/header:opacity-100"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                <p className="font-medium">Close panel</p>
                <p className="text-xs text-muted-foreground">⌘⇧\\</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </header>
  );
}
