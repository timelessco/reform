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
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
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
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

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
        "group/header flex h-10 w-full items-center justify-between bg-background px-2 pl-4 text-[13px] -z-10 font-medium shrink-0 select-none transition-opacity duration-150",
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
            render={
              () => (
<svg width="16" height="21" viewBox="0 0 16 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.6723 16.4565C13.281 16.4565 12.9477 16.3188 12.6723 16.0434C12.397 15.7681 12.2593 15.4347 12.2593 15.0434C12.2593 14.6376 12.397 14.3043 12.6723 14.0434C12.9477 13.7681 13.281 13.6304 13.6723 13.6304C14.0781 13.6304 14.4115 13.7681 14.6723 14.0434C14.9477 14.3043 15.0854 14.6376 15.0854 15.0434C15.0854 15.4347 14.9477 15.7681 14.6723 16.0434C14.4115 16.3188 14.0781 16.4565 13.6723 16.4565Z" fill="#303030"/>
<path d="M7.21152 7.17391C7.25499 7 7.24775 6.86232 7.18978 6.76087C7.13181 6.65942 7.01586 6.58696 6.84195 6.54348C6.66804 6.5 6.42891 6.47826 6.12456 6.47826H5.49412L5.68978 5.54348H7.58108L7.73325 4.93478C8.09557 3.51449 8.70427 2.34058 9.55934 1.41304C10.4289 0.471014 11.4869 0 12.7333 0C13.4869 0 14.0666 0.166667 14.4724 0.500001C14.8782 0.833334 15.0304 1.24638 14.9289 1.73913C14.8564 2.04348 14.7115 2.28986 14.4941 2.47826C14.2912 2.65217 14.0376 2.73913 13.7333 2.73913C13.4579 2.73913 13.2695 2.65942 13.168 2.5C13.0666 2.34058 12.9796 2.0942 12.9072 1.76087C12.8347 1.42754 12.7405 1.17391 12.6246 1C12.5086 0.826087 12.3057 0.739131 12.0159 0.739131C11.4072 0.739131 10.9362 1.06522 10.6028 1.71739C10.284 2.35507 10.0086 3.16667 9.77673 4.15217C9.74775 4.23913 9.71876 4.36232 9.68978 4.52174L9.42891 5.54348H12.2115L12.0159 6.47826H10.4941C10.1753 6.47826 9.92166 6.5 9.73325 6.54348C9.54485 6.58696 9.39268 6.66667 9.27673 6.78261C9.17528 6.88406 9.10282 7.03623 9.05934 7.23913L7.21152 15.4783C7.02311 16.3623 6.69702 17.1739 6.23325 17.913C5.78398 18.6667 5.21876 19.2681 4.5376 19.7174C3.84195 20.1812 3.06659 20.413 2.21152 20.413C1.47239 20.413 0.899922 20.2464 0.494124 19.913C0.0738346 19.5942 -0.0783392 19.1812 0.0376028 18.6739C0.110067 18.3696 0.254994 18.1232 0.472385 17.9348C0.675284 17.7609 0.921661 17.6739 1.21152 17.6739C1.50137 17.6739 1.69702 17.7536 1.79847 17.913C1.89992 18.0725 1.98688 18.3188 2.05934 18.6522C2.13181 18.9855 2.22601 19.2391 2.34195 19.413C2.4434 19.587 2.6463 19.6739 2.95065 19.6739C3.53036 19.6739 3.99412 19.3406 4.34195 18.6739C4.68978 18.0072 5.00137 17.0797 5.27673 15.8913L7.21152 7.17391Z" fill="#303030"/>
</svg>
              )
            }
          />
        )}  
        {/* Breadcrumb: Workspace / Form Name / Page */}
        {isFormBuilder && savedDocs?.[0] && (
          <div className="flex items-center gap-2 text-sm ml-2">
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

      {/* Right Section: Actions — hidden when any editor sidebar is open */}
      <div className={cn("flex items-center gap-1", isEditorSidebarOpen && "hidden")}>
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
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2.5 text-muted-foreground hover:text-foreground font-normal",
                      demo && "text-foreground bg-accent/50",
                    )}
                    onClick={handleTogglePreview}
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
                  <div className="my-1 h-px bg-border" />
                  <Button
                    variant="ghost"
                    onClick={() => navigate({ to: "/signin" })}
                    className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-medium leading-[1.15] tracking-[0.13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex-1 text-left">Sign in</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate({ to: "/signup" })}
                    className="h-[26px] px-2 py-[7px] rounded-lg inline-flex justify-start items-center gap-2 overflow-hidden text-foreground text-[13px] font-medium leading-[1.15] tracking-[0.13px] font-case transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex-1 text-left">Sign up</span>
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
            {/* Reset to last published version */}
            {hasUnpublishedChanges && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setIsDiscardDialogOpen(true)}
                      disabled={isDiscarding}
                    />
                  }
                >
                  {isDiscarding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Reset to last published version</p>
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

    <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This will revert the form to the last published version. Any unsaved changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleDiscardChanges();
              setIsDiscardDialogOpen(false);
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
