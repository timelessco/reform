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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleFavoriteLocal } from "@/db-collections/favorite.collection";
import { updateFormStatus } from "@/db-collections/form.collections";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { discardChanges, publishForm, useHasUnpublishedChanges } from "@/hooks/use-form-versions";
import { useForm, useIsFavorite, useWorkspace } from "@/hooks/use-live-hooks";
import { useSession } from "@/lib/auth-client";
import { HOTKEYS, formatForDisplay } from "@/lib/hotkeys";
import { cn, parseTimestampAsUTC } from "@/lib/utils";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import { useState } from "react";
import { toast } from "sonner";
import { LogoToggle } from "./logo";
import { useSidebarSafe } from "./sidebar";

interface AppHeaderProps {
  isDistractionHidden?: boolean;
}

export function AppHeader({ isDistractionHidden = false }: AppHeaderProps) {
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
  const isFormBuilder = pathname.startsWith("/form-builder") || pathname.includes("/form-builder/");
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
  const hasPublishedVersion = !!savedDocs?.[0]?.lastPublishedVersionId;

  // Consolidated state: workflow, dialogs, menus, tooltips
  type WorkflowState = "idle" | "publishing" | "discarding";
  type ActiveDialog = "delete" | "discard" | null;
  type ActiveMenu = "main" | "local" | null;
  const [workflowState, setWorkflowState] = useState<WorkflowState>("idle");
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);

  // Derived booleans for readability
  const isDiscarding = workflowState === "discarding";
  const isPublishing = workflowState === "publishing";

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
      setWorkflowState("publishing");
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
        setWorkflowState("idle");
      }
    }
  };

  const handleDiscardChanges = async () => {
    if (formId) {
      setWorkflowState("discarding");
      try {
        const tx = discardChanges(formId);
        await tx.isPersisted.promise;
        toast.info("Changes discarded, reverted to last published version");
      } catch (error) {
        toast.error("Failed to discard changes");
        console.error(error);
      } finally {
        setWorkflowState("idle");
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
    enabled: isFormBuilder && isEditRoute && hasPublishedVersion,
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
    enabled: (isFormBuilder && isEditRoute) || isLandingPage,
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
      onClick: () => handleToggleFavorite(),
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
      onClick: () => toggleVersionHistory(),
      show: isEditRoute && hasPublishedVersion,
    },
    {
      key: "delete",
      label: "Delete form",
      onClick: () => setActiveDialog("delete"),
    },
  ].filter((item) => item.show ?? true);

  return (
    <>
      <header
        className={cn(
          "group/header flex h-10 w-full items-center justify-between bg-background px-2 text-[13px] -z-10 shrink-0 select-none transition-opacity duration-150",
          isDistractionHidden && "opacity-0 pointer-events-none",
        )}
      >
        {/* Left Section: Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isLandingPage && <LogoToggle static className="-ml-1" />}
          {!isLandingPage && state === "collapsed" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <LogoToggle
                    direction="right"
                    onClick={() => toggleMainSidebar()}
                    className="-ml-1"
                  />
                }
              />
              <TooltipContent side="right">
                <p>Expand sidebar</p>
                <p className="text-xs text-muted-foreground">
                  {formatForDisplay(HOTKEYS.DISMISS_SIDEBARS)}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Breadcrumb: Workspace / Form Name / Page */}
          {isFormBuilder && savedDocs?.[0] && (
            <div className="flex items-center text-sm">
              {workspace && (
                <>
                  <Link
                    to="/dashboard"
                    className={cn(
                      buttonVariants({ variant: "link", size: "sm" }),
                      "text-muted-foreground hover:text-foreground truncate max-w-[150px] no-underline hover:underline pl-0",
                    )}
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
                  className={cn(
                    buttonVariants({ variant: "link", size: "sm" }),
                    "max-w-[200px] text-foreground no-underline px-1.5 justify-start overflow-hidden",
                  )}
                >
                  <span className="truncate hover:underline">
                    {savedDocs?.[0].title || "Untitled"}
                  </span>
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: "link", size: "sm" }),
                    "max-w-[200px] no-underline cursor-default px-1.5 justify-start overflow-hidden",
                  )}
                >
                  <span className="truncate">{savedDocs?.[0].title || "Untitled"}</span>
                </span>
              )}
              <span className="text-muted-foreground/50">/</span>
              <span
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "text-muted-foreground no-underline cursor-default px-1.5",
                )}
              >
                {isEditRoute ? "Editor" : "Submissions"}
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Actions — hidden when any editor sidebar is open */}
        <div className={cn("flex items-center gap-1", isEditorSidebarOpen && "hidden")}>
          {isFormBuilder &&
            savedDocs?.[0]?.updatedAt &&
            !isEditorSidebarOpen &&
            !isLoadingSavedDocs && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="mr-1 inline-flex h-7 items-center whitespace-nowrap rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-normal text-muted-foreground/70" />
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
                    <p className="text-xs text-background/70">
                      Edited by{" "}
                      <span className="text-background">{session?.user?.name ?? "You"}</span>{" "}
                      {formatDistanceToNow(
                        parseTimestampAsUTC(savedDocs?.[0]?.updatedAt) ?? new Date(),
                      )}{" "}
                      ago
                    </p>
                    {savedDocs?.[0]?.createdAt && (
                      <p className="text-xs text-background/70">
                        Created by{" "}
                        <span className="text-background">{session?.user?.name ?? "You"}</span>{" "}
                        {format(
                          parseTimestampAsUTC(savedDocs?.[0]?.createdAt) ?? new Date(),
                          "MMM d, yyyy",
                        )}
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
              className={cn(
                "px-2.5 text-muted-foreground hover:text-foreground font-normal",
                activeSidebar === "about" && "text-foreground bg-accent/50",
              )}
              onClick={() => toggleEditorSidebar("about")}
            >
              About
            </Button>
          )}

          {isLandingPage && (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "px-2.5 text-muted-foreground hover:text-foreground font-normal",
                        demo && "text-foreground bg-accent/50",
                      )}
                      onClick={handleTogglePreview}
                    />
                  }
                >
                  {demo ? "Editor" : "Preview"}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  <p>{demo ? "Back to Editor" : "Preview Form"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatForDisplay(HOTKEYS.TOGGLE_PREVIEW)}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "px-2.5 text-muted-foreground hover:text-foreground font-normal",
                  activeSidebar === "about" && "text-foreground bg-accent/50",
                )}
                onClick={() => toggleEditorSidebar("about")}
              >
                About
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => toggleEditorSidebar("settings")}
                aria-label="Settings"
              >
                <SettingsIcon fill="transparent" />
              </Button>
              <Popover
                open={activeMenu === "local"}
                onOpenChange={(open) => setActiveMenu(open ? "local" : null)}
              >
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label="More options"
                    />
                  }
                >
                  <MoreHorizontalIcon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48" sideOffset={4}>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActiveMenu(null);
                        setTimeout(() => toggleEditorSidebar("customize"), 150);
                      }}
                      className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="flex-1 text-left">Customization</span>
                      <span className="text-xs text-muted-foreground ml-auto pl-3">
                        {formatForDisplay(HOTKEYS.TOGGLE_CUSTOMIZE_SIDEBAR)}
                      </span>
                    </Button>
                    <div className="my-1 h-px bg-border" />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActiveMenu(null);
                        setTimeout(() => navigate({ to: "/login" }), 150);
                      }}
                      className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="flex-1 text-left">Sign in</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setActiveMenu(null);
                        setTimeout(() => navigate({ to: "/signup" }), 150);
                      }}
                      className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="flex-1 text-left">Sign up</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                className="pl-2.5 pr-2 py-1.5 ml-1 text-[14px] transition-all rounded-[8px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.06)] border-none bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
                onClick={() => navigate({ to: "/signup" })}
              >
                Publish
              </Button>
            </>
          )}

          {isFormBuilder && (
            <>
              {/* Reset to last published version */}
              {hasUnpublishedChanges && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setActiveDialog("discard")}
                        disabled={isDiscarding}
                      />
                    }
                  >
                    {isDiscarding ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <RotateCcwIcon className="h-4 w-4" strokeWidth={2} />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset to last published version</p>
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
                            " px-2.5 text-muted-foreground hover:text-foreground font-normal",
                            demo && "text-foreground bg-accent/50",
                          )}
                        />
                      }
                    >
                      {demo ? "Editor" : "Preview"}
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="end">
                      <p>{demo ? "Back to Editor" : "Preview Form"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatForDisplay(HOTKEYS.TOGGLE_PREVIEW)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <TooltipProvider>
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
                            onClick={() => toggleShareSidebar()}
                          />
                        }
                      >
                        Share
                      </TooltipTrigger>
                      {!isEditorSidebarOpen && (
                        <TooltipContent side="bottom" align="end">
                          <p>Share</p>
                          <p className="text-xs text-muted-foreground">
                            {formatForDisplay(HOTKEYS.TOGGLE_SHARE_SIDEBAR)}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}

                  {/* Settings icon button directly in header - toggles form settings sidebar */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Settings"
                          onClick={() => toggleSettingsSidebar()}
                        />
                      }
                    >
                      <SettingsIcon fill="transparent" />
                    </TooltipTrigger>
                    {!isEditorSidebarOpen && (
                      <TooltipContent side="bottom" align="end">
                        <p>Settings</p>
                        <p className="text-xs text-muted-foreground">
                          {formatForDisplay(HOTKEYS.TOGGLE_SETTINGS_SIDEBAR)}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Three dots menu - popover button list matching workspace/sidebar style */}
                <Popover
                  open={activeMenu === "main"}
                  onOpenChange={(open) => setActiveMenu(open ? "main" : null)}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-background rounded-lg"
                        aria-label="More options"
                      />
                    }
                  >
                    <MoreHorizontalIcon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48" sideOffset={4}>
                    <div className="flex flex-col">
                      {menuItems.map((item) => (
                        <Button
                          key={item.key}
                          variant="ghost"
                          onClick={() => {
                            setActiveMenu(null);
                            // Defer action so popover fully closes before any layout shift
                            setTimeout(() => item.onClick(), 150);
                          }}
                          className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
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
                          "pl-2 pr-2 py-1.5 ml-1 text-[14px] transition-all rounded-[8px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.06)] border-none",
                          !isLoadingSavedDocs &&
                            (hasUnpublishedChanges || savedDocs?.[0]?.status !== "published")
                            ? "bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                        onClick={handlePublish}
                        disabled={
                          isPublishing ||
                          (!hasUnpublishedChanges && savedDocs?.[0]?.status === "published")
                        }
                      />
                    }
                  >
                    {isPublishing ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
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
                            "pl-[10px] pr-[8px] ml-1 text-[14px] transition-all rounded-[8px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.06)] border-none bg-black hover:bg-stone-800 text-white dark:bg-white dark:text-black dark:hover:bg-stone-200",
                          )}
                        />
                      }
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
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

      <AlertDialog
        open={activeDialog === "delete"}
        onOpenChange={(open) => setActiveDialog(open ? "delete" : null)}
      >
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

      <AlertDialog
        open={activeDialog === "discard"}
        onOpenChange={(open) => setActiveDialog(open ? "discard" : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the form to the last published version. Any unsaved changes will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDiscardChanges();
                setActiveDialog(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
