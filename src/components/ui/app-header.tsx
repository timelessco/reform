import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMinimalSidebarSafe } from "@/contexts/minimal-sidebar-context";
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
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  ChevronRight,
  History,
  Loader2,
  MoreHorizontal,
  Settings,
  Settings2,
  Star,
  Trash2
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useSidebarSafe } from "./sidebar";

interface AppHeaderProps {
  formId?: string;
  workspaceId?: string;
}

export function AppHeader({ formId, workspaceId }: AppHeaderProps) {
  const sidebarContext = useSidebarSafe();
  const minimalSidebar = useMinimalSidebarSafe();
  const isPinned = minimalSidebar?.isPinned ?? true;
  const togglePin = minimalSidebar?.togglePin || (() => { });
  const setIsHovered = minimalSidebar?.setIsHovered || (() => { });

  const state = sidebarContext?.state;
  const { pathname } = useLocation();
  const isFormBuilder = pathname.startsWith("/form-builder") || pathname.includes("/form-builder/");
  const isEditRoute = pathname.endsWith("/edit");
  const { data: sessionData } = useSession();
  const session = sessionData;
  const navigate = useNavigate();

  // Editor sidebar state
  const { activeSidebar, toggleSidebar } = useEditorSidebar();

  const isSettingsSidebarOpen = activeSidebar === "settings";
  const isShareSidebarOpen = activeSidebar === "share";

  const toggleVersionHistory = () => toggleSidebar("history");
  const toggleSettingsSidebar = () => toggleSidebar("settings", "settings");
  const toggleShareSidebar = () => toggleSidebar("share");
  const toggleIntegrationsSidebar = () => toggleSidebar("settings", "integrations");
  const toggleAnalyticsSidebar = () => toggleSidebar("share", "summary");

  const isVersionHistoryOpen = activeSidebar === "history";
  // Get search params for the current route
  const search: any = useSearch({ strict: false });
  const demo = search.demo;

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
          search: { sidebar: "share" }
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
    <header className="flex h-10 w-full items-center justify-between border-b border-foreground/5 bg-background px-3 text-[13px] font-medium shrink-0 select-none">
      {/* Left Section: Breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {state === "collapsed" && (
          <div className="mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground -ml-1 group relative flex items-center justify-center transition-all duration-300"
              onClick={() => sidebarContext?.toggleSidebar()}
            >
              {/* Vertical line - default state */}
              <span className="absolute w-[2px] h-4 bg-muted-foreground/30 rounded-full transition-all duration-300 group-hover:opacity-0 group-hover:scale-y-0" />
              {/* Chevron Right - hover state */}
              <ChevronRight className="h-4 w-4 absolute opacity-0 scale-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 text-foreground" />
            </Button>
          </div>
        )}
        {!isPinned && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground -ml-1 group relative flex items-center justify-center transition-all duration-300"
            onClick={togglePin}
            onMouseEnter={() => setIsHovered(true)}
          >
            {/* Vertical line - default state */}
            <span className="absolute w-[2px] h-4 bg-muted-foreground/30 rounded-full transition-all duration-300 group-hover:opacity-0 group-hover:scale-y-0" />
            {/* Chevron Right - hover state */}
            <ChevronRight className="h-4 w-4 absolute opacity-0 scale-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 text-foreground" />
          </Button>
        )}

        {state === "collapsed" && (
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity ml-1">
            <span className="text-2xl font-serif italic font-bold tracking-tighter leading-none mb-1">f.</span>
          </Link>
        )}
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1">
        {isFormBuilder && currentForm?.updatedAt && (
          <span className="text-[11px] text-muted-foreground/40 mr-2 whitespace-nowrap">
            Edited {formatDistanceToNow(new Date(currentForm.updatedAt))} ago
          </span>
        )}

        {isFormBuilder && (
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

            <div className="flex items-center gap-1.5 mr-1">
              {currentForm?.status === "published" && (
                <>
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

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-muted-foreground hover:text-foreground",
                      isSettingsSidebarOpen && "bg-muted text-foreground",
                    )}
                    onClick={toggleSettingsSidebar}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* History icon - only in edit route for published forms */}
              {isEditRoute && currentForm?.status === "published" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 text-muted-foreground hover:text-foreground",
                        isVersionHistoryOpen && "bg-muted text-foreground",
                      )}
                      onClick={toggleVersionHistory}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Version History</TooltipContent>
                </Tooltip>
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
                  <DropdownMenuItem onClick={handleToggleFavorite} className="gap-2">
                    <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")} />
                    {isFavorite ? "Unfavorite" : "Favorite"}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={toggleAnalyticsSidebar} className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleIntegrationsSidebar} className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Integrations
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
    </header>
  );
}
