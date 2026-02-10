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
  ChevronRight,
  ChevronsRight,
  History,
  Loader2,
  MoreHorizontal,
  Settings,
  Star,
  Trash2
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
  const { state, toggleSidebar: toggleMainSidebar } = useSidebarSafe() || { state: "expanded", toggleSidebar: () => { } };
  const { pathname , search } = useLocation();
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
  const toggleSettingsSidebar = () => toggleSidebar("settings", "settings");
  const toggleShareSidebar = () => {
    toggleSidebar("share");
    if (workspaceId && formId) {
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: workspaceId, formId: formId },
        search: {
          demo: !isShareSidebarOpen,
          force: true,
          sidebar: isShareSidebarOpen ? '' : 'share',
          embedType: "fullpage"
        },
      });
    }
  };
  const toggleIntegrationsSidebar = () => toggleSidebar("settings", "integrations");
  const toggleAnalyticsSidebar = () => toggleSidebar("share", "summary");

  // Get search params for the current route
  const searchParams: any = useSearch({ strict: false });
  const demo = searchParams.demo;

  // Primary: TanStack Query cache (primed by route loader, immediate on navigation)
  const { data: serverFormData } = useQuery({
    ...getFormbyIdQueryOption(formId!),
    enabled: !!formId,
  });
  // Secondary: Electric live data (real-time but async)
  const { data: savedDocs } = useForm(formId);

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

  return (
    <header
      className={cn(
        "group/header flex h-10 w-full items-center justify-between bg-background px-3 text-[13px] -z-10 font-medium shrink-0 select-none transition-opacity duration-150",
        isDistractionHidden && "opacity-0 pointer-events-none",
      )}
    >
      {/* Left Section: Breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {state === "collapsed" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground -ml-1 group relative flex items-center justify-center transition-all duration-300"
            onClick={() => toggleMainSidebar()}
          >
            {/* Vertical line - default state */}
            <span className="absolute w-[2px] h-4 bg-muted-foreground/30 rounded-full transition-all duration-300 group-hover:opacity-0 group-hover:scale-y-0" />
            {/* Chevron Right - hover state */}
            <ChevronRight className="h-4 w-4 absolute opacity-0 scale-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 text-foreground" />
          </Button>
        )}
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1">
        {isFormBuilder && currentForm?.updatedAt && !isEditorSidebarOpen && (
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

            <div className="flex items-center gap-1.5 mr-1">
              {isEditRoute && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={cn(
                    "h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted font-normal",
                    demo && "text-foreground bg-muted"
                  )}
                >
                  <Link to="." search={(prev: any) => ({ ...prev, demo: !demo , sidebar : ''})} replace>
                    {demo ? "Editor" : "Preview"}
                  </Link>
                </Button>
              )}

              {currentForm?.status === "published" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted font-normal",
                    isShareSidebarOpen && "text-foreground bg-muted"
                  )}
                  onClick={toggleShareSidebar}
                >
                  Share
                </Button>
              )}

              {/* Three dots menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {currentForm?.status === "published" && (
                    <>
                      <DropdownMenuItem onClick={toggleSettingsSidebar} className="gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      {isEditRoute && (
                        <DropdownMenuItem onClick={toggleVersionHistory} className="gap-2">
                          <History className="h-4 w-4" />
                          Version History
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleToggleFavorite} className="gap-2">
                    <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")} />
                    {isFavorite ? "Unfavorite" : "Favorite"}
                  </DropdownMenuItem>

                  {/* <DropdownMenuItem onClick={toggleAnalyticsSidebar} className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </DropdownMenuItem> */}
                  {/* <DropdownMenuItem onClick={toggleIntegrationsSidebar} className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Integrations
                  </DropdownMenuItem> */}

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

            {/* Main Action Button (Black style from mockup) */}
            {isEditRoute && (
              <Button
                size="sm"
                className={cn(
                  "h-8 px-4 ml-1 text-[13px] font-semibold transition-all rounded-md shadow-sm border-none",
                  (hasUnpublishedChanges || currentForm?.status !== "published")
                    ? "bg-stone-900 border-none hover:bg-stone-800 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                onClick={handlePublish}
                disabled={publishMutation.isPending || (!hasUnpublishedChanges && currentForm?.status === "published")}
              >
                {publishMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                {currentForm?.status === "published"
                  ? (hasUnpublishedChanges ? "Publish Changes" : "Published")
                  : "Publish"
                }
              </Button>
            )}
          </>
        )}
      </div>

      {isSidebarOpen && typeof dividerX === "number" && (
        <div
          className="pointer-events-none fixed top-0 h-10 z-1000"
          style={{ left: dividerX + 8 }}
        >
          <div className="pointer-events-auto absolute top-[6px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={closeSidebar}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/60 text-muted-foreground opacity-0 transition-opacity group-hover/header:opacity-100 hover:text-foreground hover:bg-muted"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
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
