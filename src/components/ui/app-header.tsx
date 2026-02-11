import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleFavoriteLocal } from "@/db-collections";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import {
  useDiscardChanges,
  useHasUnpublishedChanges,
  usePublishVersion,
} from "@/hooks/use-form-versions";
import { useForm, useIsFavorite } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { deleteForm, getFormbyIdQueryOption } from "@/lib/fn/forms";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ChevronsRight,
  Copy,
  History,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useSidebarSafe } from "./sidebar";

interface AppHeaderProps {
  formId?: string;
  workspaceId?: string;
  dividerX?: number;
  isSidebarOpen?: boolean;
  isDistractionHidden?: boolean;
}

export function AppHeader({
  formId,
  workspaceId,
  dividerX,
  isSidebarOpen,
  isDistractionHidden = false,
}: AppHeaderProps) {
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

  const toggleVersionHistory = () => toggleSidebar("history");
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

  // Primary: TanStack Query cache (primed by route loader, immediate on navigation)
  const { data: serverFormData } = useQuery({
    ...getFormbyIdQueryOption(formId!),
    enabled: !!formId,
  });
  // Secondary: Electric live data (real-time but async)
  const { data: savedDocs, isLoading: isLoadingSavedDocs } = useForm(formId);

  // Prefer Electric (real-time) when available, fall back to server cache
  const currentForm = useMemo(() => {
    if (!formId) return undefined;
    const electricForm = savedDocs?.find((doc: any) => doc.id === formId);
    return electricForm ?? serverFormData?.form;
  }, [savedDocs, formId, serverFormData]);

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteForm({ data: { id } }),
    onSuccess: () => {
      toast.success("Form deleted successfully");
      navigate({ to: "/" });
    },
    onError: () => {
      toast.error("Failed to delete form");
    },
  });

  const handleDeleteForm = async () => {
    if (!formId) return;
    if (confirm("Are you sure you want to delete this form?")) {
      deleteMutation.mutate(formId);
    }
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
          to: "/workspace/$workspaceId/form-builder/$formId/submissions",
          params: { workspaceId, formId },
          // search: { sidebar: "share" }
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

  const handleCopyLink = () => {
    if (!formId) return;
    const url = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDuplicate = () => {
    // TODO: Implement duplicate functionality
    toast.info("Duplicate feature coming soon");
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
            <span className="text-2xl font-serif italic font-bold tracking-tighter">f.</span>
          </Button>
        )}

        {/* Breadcrumb: Form Name / Page */}
        {isFormBuilder && currentForm && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium truncate max-w-[200px]">
              {currentForm.title || "Untitled"}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">
              {isEditRoute ? "Editor" : "Submissions"}
            </span>
          </div>
        )}
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1">
        {isFormBuilder && currentForm?.updatedAt && !isEditorSidebarOpen && !isLoadingSavedDocs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-muted-foreground/70 mr-2 whitespace-nowrap rounded-md bg-muted/60 px-2 py-1">
                Edited {formatDistanceToNow(new Date(currentForm.updatedAt))} ago
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Edited by{" "}
                  <span className="font-medium text-foreground">
                    {session?.user?.name ?? "You"}
                  </span>{" "}
                  {formatDistanceToNow(new Date(currentForm.updatedAt))} ago
                </p>
                {currentForm?.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Created by{" "}
                    <span className="font-medium text-foreground">
                      {session?.user?.name ?? "You"}
                    </span>{" "}
                    {format(new Date(currentForm.createdAt), "MMM d, yyyy")}
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
                    disabled={discardMutation.isPending}
                  >
                    {discardMutation.isPending ? (
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

              {!isLoadingSavedDocs && currentForm?.status === "published" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal",
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

              {/* Three dots menu */}
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
                <DropdownMenuContent align="end" className="w-56">

                  {/* Copy link */}
                  <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Copy link
                  </DropdownMenuItem>

                  {/* Duplicate */}
                  <DropdownMenuItem onClick={handleDuplicate} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {isEditRoute && (
                    <DropdownMenuItem onClick={toggleVersionHistory} className="gap-2">
                      <History className="h-4 w-4" />
                      Version History
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleToggleFavorite} className="gap-2">
                    <Star
                      className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")}
                    />
                    {isFavorite ? "Unfavorite" : "Favorite"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteForm}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
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
                  "h-8 px-4 ml-1 text-[13px] font-semibold transition-all rounded-md shadow-sm border-none",
                  !isLoadingSavedDocs &&
                    (hasUnpublishedChanges || currentForm?.status !== "published")
                    ? "bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                onClick={handlePublish}
                disabled={
                  publishMutation.isPending ||
                  (!hasUnpublishedChanges && currentForm?.status === "published")
                }
              >
                {publishMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                {currentForm?.status === "published" ? "Published" : "Publish"}
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
