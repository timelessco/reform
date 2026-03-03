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
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleFavoriteLocal, updateFormStatus } from "@/db-collections";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { discardChanges, publishForm, useHasUnpublishedChanges } from "@/hooks/use-form-versions";
import { useForm, useIsFavorite, useWorkspace } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { HOTKEYS, formatForDisplay } from "@/lib/hotkeys";
import { cn, parseTimestampAsUTC } from "@/lib/utils";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "./logo";
import { useSidebarSafe } from "./sidebar";
import { SettingsIcon } from "./sidebar-icons";

interface AppHeaderProps {
  isDistractionHidden?: boolean;
}

export function AppHeader({
  isDistractionHidden = false,
}: AppHeaderProps) {
  const { formId, workspaceId } = useParams({ strict: false }) as {
    formId?: string;
    workspaceId?: string;
  };
  const { state, toggleSidebar: toggleMainSidebar } = useSidebarSafe() || {
    state: "expanded",
    toggleSidebar: () => {},
  };
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";
  const isLandingPage = pathname === "/";
  const isFormBuilder =
    pathname.startsWith("/form-builder") || pathname.includes("/form-builder/");
  const isEditRoute = pathname.endsWith("/edit");
  const { data: sessionData } = useSession();
  const session = sessionData;
  const navigate = useNavigate();

  // Editor sidebar state
  const { activeSidebar, closeSidebar, toggleSidebar: toggleEditorSidebar } = useEditorSidebar();

  const isShareSidebarOpen = activeSidebar === "share";
  const isEditorSidebarOpen = !!activeSidebar;

  const isVersionHistoryOpen = activeSidebar === "history";
  const toggleVersionHistory = () => {
    toggleEditorSidebar("history");
  };
  const isSettingsSidebarOpen = activeSidebar === "settings";
  const toggleSettingsSidebar = () => {
    toggleEditorSidebar("settings");
  };

  const isCustomizeSidebarOpen = activeSidebar === "customize";
  const toggleCustomizeSidebar = () => {
    toggleEditorSidebar("customize");
  };

  const handleCloseSidebar = () => {
    closeSidebar();
  };

  const toggleShareSidebar = () => {
    toggleEditorSidebar("share");
  };

  const searchParams: any = useSearch({ strict: false });
  const demo = searchParams.demo;

  // Single source: Electric live data (useForm)
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: savedDocs, isLoading: isLoadingSavedDocs } = useForm(formId);
  // Version management

  const hasUnpublishedChanges = useHasUnpublishedChanges(formId);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Favorite state
  useIsFavorite(session?.user?.id, formId);

  const handleToggleFavorite = async () => {
    if (!session?.user?.id || !formId) return;
    await toggleFavoriteLocal(session.user.id, formId);
  };

  const handleDeleteForm = async () => {
    if (!formId) return;
    try {
      await updateFormStatus(formId, "archived");
      toast.success("Form moved to trash");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Failed to delete form");
    }
  };

  const handlePublish = async () => {
    if (formId && workspaceId) {
      setIsPublishing(true);
      try {
        const tx = publishForm(formId);
        await tx.isPersisted.promise;
        toast.success("Form published");
        navigate({
          to: "/workspace/$workspaceId/form-builder/$formId/submissions",
          params: { workspaceId, formId },
        });
      } catch (error) {
        toast.error("Failed to publish form");
        console.error(error);
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const handleDiscardChanges = async () => {
    if (formId) {
      setIsDiscarding(true);
      try {
        const tx = discardChanges(formId);
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

  // Scoped hotkeys for form-builder actions
  useHotkey(HOTKEYS.TOGGLE_SETTINGS_SIDEBAR, () => toggleSettingsSidebar(), {
    enabled: isFormBuilder || isLandingPage,
  });

  useHotkey(HOTKEYS.TOGGLE_CUSTOMIZE_SIDEBAR, () => toggleCustomizeSidebar(), {
    enabled: (isFormBuilder && isEditRoute) || isLandingPage,
  });

  useHotkey(HOTKEYS.TOGGLE_VERSION_HISTORY, () => toggleVersionHistory(), {
    enabled: isFormBuilder && isEditRoute,
  });

  useHotkey(HOTKEYS.TOGGLE_FAVORITE, () => handleToggleFavorite(), {
    enabled: isFormBuilder && !!formId,
  });

  useHotkey(HOTKEYS.PUBLISH_FORM, () => handlePublish(), {
    enabled: isFormBuilder && isEditRoute && !isPublishing,
  });

  const handleEditForm = () => {
    if (workspaceId && formId) {
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId, formId },
        search: (prev: any) => ({ ...prev, force: true }),
      });
    }
  };

  useHotkey(HOTKEYS.EDIT_FORM, () => handleEditForm(), {
    enabled: isFormBuilder && !isEditRoute && !!workspaceId && !!formId,
  });

  const handleTogglePreview = () => {
    navigate({
      to: ".",
      search: (prev: any) => ({ ...prev, demo: !demo }),
      replace: true,
    });
  };

  useHotkey(HOTKEYS.TOGGLE_PREVIEW, () => handleTogglePreview(), {
    enabled: isFormBuilder && isEditRoute,
  });

  useHotkey(HOTKEYS.TOGGLE_SHARE_SIDEBAR, () => toggleShareSidebar(), {
    enabled: isFormBuilder && isEditRoute && savedDocs?.[0]?.status === "published",
  });

  const isLeftSidebarOpen = state === "expanded";

  const handleDismissSidebars = () => {
    if (isEditorSidebarOpen && isLeftSidebarOpen) {
      // Both open → close both
      handleCloseSidebar();
      toggleMainSidebar();
    } else if (isEditorSidebarOpen) {
      // Only right open → close right
      handleCloseSidebar();
    } else if (isLeftSidebarOpen) {
      // Only left open → close left
      toggleMainSidebar();
    } else {
      // Both closed → open left sidebar + right (share) sidebar
      toggleMainSidebar();
      toggleShareSidebar();
    }
  };

  useHotkey(HOTKEYS.DISMISS_SIDEBARS, () => handleDismissSidebars(), {
    enabled: isFormBuilder,
  });

  const menuItems = [
    {
      key: "favorite",
      label: "Favorite",
      shortcut: formatForDisplay(HOTKEYS.TOGGLE_FAVORITE),
      onClick: () => {
        handleToggleFavorite();
      },
    },
    {
      key: "analytics",
      label: "Analytics",
      onClick: () => {
        if (workspaceId && formId) {
          navigate({
            to: "/workspace/$workspaceId/form-builder/$formId/submissions",
            params: { workspaceId, formId },
          });
        }
      },
    },
    {
      key: "customization",
      label: "Customization",
      shortcut: formatForDisplay(HOTKEYS.TOGGLE_CUSTOMIZE_SIDEBAR),
      onClick: () => {
        toggleCustomizeSidebar();
        if (isSettingsSidebarOpen) toggleSettingsSidebar();
      },
      show: isEditRoute,
    },
    {
      key: "versionHistory",
      label: "Version History",
      shortcut: formatForDisplay(HOTKEYS.TOGGLE_VERSION_HISTORY),
      onClick: () => {
        toggleVersionHistory();
      },
      show: isEditRoute,
    },
    {
      key: "delete",
      label: "Delete form",
      onClick: () => {
        setIsDeleteOpen(true);
      },
    },
  ].filter((item) => item.show ?? true);

  return (
    <>
    <header
      className={cn(
        "group/header flex h-10 w-full items-center justify-between bg-background px-3 text-[13px] -z-10 font-medium shrink-0 select-none transition-opacity duration-150",
        isDistractionHidden && "opacity-0 pointer-events-none",
      )}
    >
      {/* Left Section: Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {(isLandingPage || state === "collapsed") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground -ml-1 group relative flex items-center justify-center transition-all duration-300"
            onClick={() => {
              if (!isLandingPage) toggleMainSidebar();
            }}
          >
            <Logo className="h-6 w-6 text-sidebar-nav-text" />
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
        {isFormBuilder &&
          savedDocs?.[0]?.updatedAt &&
          !isEditorSidebarOpen &&
          !isLoadingSavedDocs && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="text-[11px] text-muted-foreground/70 mr-2 whitespace-nowrap rounded-md bg-muted/60 px-2 py-1" />
                }
              >
                Edited{" "}
                {formatDistanceToNow(
                  parseTimestampAsUTC(savedDocs?.[0]?.updatedAt) ?? new Date(),
                )}{" "}
                ago
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Edited by{" "}
                    <span className="font-medium text-foreground">
                      {session?.user?.name ?? "You"}
                    </span>{" "}
                    {formatDistanceToNow(
                      parseTimestampAsUTC(savedDocs?.[0]?.updatedAt) ??
                        new Date(),
                    )}{" "}
                    ago
                  </p>
                  {savedDocs?.[0]?.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Created by{" "}
                      <span className="font-medium text-foreground">
                        {session?.user?.name ?? "You"}
                      </span>{" "}
                      {format(
                        parseTimestampAsUTC(savedDocs?.[0]?.createdAt) ??
                          new Date(),
                        "MMM d, yyyy",
                      )}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}

        {isDashboard && (
          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal",
            )}
          >
            About
          </Link>
        )}

        {isLandingPage && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal",
                activeSidebar === "about" && "text-foreground bg-accent/50",
              )}
              onClick={() => toggleEditorSidebar("about")}
            >
              About
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => toggleEditorSidebar("settings")}
            >
              <SettingsIcon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            </Button>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48" sideOffset={4}>
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    onClick={() => toggleEditorSidebar("customize")}
                    className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-medium leading-[1.15] tracking-[0.13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex-1 text-left">Customization</span>
                    <span className="text-xs text-muted-foreground ml-auto pl-3">
                      {formatForDisplay(HOTKEYS.TOGGLE_CUSTOMIZE_SIDEBAR)}
                    </span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="h-8 pl-2 pr-2 py-1.5 ml-1 text-[14px] font-medium tracking-[0.14px] leading-tight transition-all rounded-[8px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.06)] border-none bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
              onClick={() => navigate({ to: "/signup" })}
            >
              Publish
            </Button>
          </>
        )}

        {isFormBuilder && (
          <>
            {/* Changes indicator - shows when there are unpublished changes */}
            {hasUnpublishedChanges && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={handleDiscardChanges}
                      disabled={isDiscarding}
                    />
                  }
                >
                  {isDiscarding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
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
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        to="."
                        search={(prev) => ({
                            ...prev,
                              demo: !demo,
                        })}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal",
                          demo && "text-foreground bg-accent/50",
                        )}
                      />
                    }
                  >
                    {demo ? "Editor" : "Preview"}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    <p className="font-medium">{demo ? "Back to Editor" : "Preview Form"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatForDisplay(HOTKEYS.TOGGLE_PREVIEW)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {savedDocs?.[0]?.status === "published" && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "px-2.5 text-muted-foreground hover:text-foreground font-normal",
                          isShareSidebarOpen && "text-foreground bg-accent/50",
                        )}
                        onClick={toggleShareSidebar}
                      />
                    }
                  >
                    Share
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    <p className="font-medium">Share</p>
                    <p className="text-xs text-muted-foreground">
                      {formatForDisplay(HOTKEYS.TOGGLE_SHARE_SIDEBAR)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Settings icon button directly in header - toggles form settings sidebar */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={toggleSettingsSidebar}
                    />
                  }
                >
                  <SettingsIcon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  <p className="font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">
                    {formatForDisplay(HOTKEYS.TOGGLE_SETTINGS_SIDEBAR)}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Three dots menu - popover button list matching workspace/sidebar style */}
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-background rounded-lg hover:text-foreground"
                    />
                  }
                >
                  <MoreHorizontal
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.5}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-48"
                  sideOffset={4}
                >
                  <div className="flex flex-col">
                    {menuItems.map((item) => (
                      <Button
                        key={item.key}
                        variant="ghost"
                        onClick={item.onClick}
                        className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-medium leading-[1.15] tracking-[0.13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-xs text-muted-foreground ml-auto pl-3">
                            {item.shortcut}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {isEditRoute ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      className={cn(
                        "h-8 pl-2 pr-2 py-1.5 ml-1 text-[14px] font-medium tracking-[0.14px] leading-tight transition-all rounded-[8px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.06)] border-none",
                        !isLoadingSavedDocs &&
                          (hasUnpublishedChanges ||
                            savedDocs?.[0]?.status !== "published")
                          ? "bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                      onClick={handlePublish}
                      disabled={
                        isPublishing ||
                        (!hasUnpublishedChanges &&
                          savedDocs?.[0]?.status === "published")
                      }
                    />
                  }
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedDocs?.[0]?.status === "published" ? (
                    "Published"
                  ) : (
                    "Publish"
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  <p className="text-xs text-muted-foreground">
                    {formatForDisplay(HOTKEYS.PUBLISH_FORM)}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              workspaceId &&
              formId && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        to="/workspace/$workspaceId/form-builder/$formId/edit"
                        params={() => ({ workspaceId, formId })}
                        search={(prev) => ({ ...prev, force: true })}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "h-8 pl-[10px] pr-[8px] ml-1 text-[14px] font-medium tracking-[0.14px] leading-tight transition-all rounded-[8px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.06)] border-none bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200",
                        )}
                      />
                    }
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    <p className="text-xs text-muted-foreground">
                      {formatForDisplay(HOTKEYS.EDIT_FORM)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </>
        )}
      </div>

    </header>

    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete form</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this form? This action will move it to trash and
            cannot be easily undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteForm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
