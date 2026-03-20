import { SidebarItem } from "@/components/sidebar-item";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/client-only";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  BellIcon,
  FileTextIcon,
  HelpCircleIcon,
  HomeIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  Undo2Icon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { LogoToggle } from "@/components/ui/logo";
import { NotFound } from "@/components/ui/not-found";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserMenuMinimal } from "@/components/user-menu-minimal";
import { EditorHeaderVisibilityProvider } from "@/contexts/editor-header-visibility-context";
import { MinimalSidebarProvider, useMinimalSidebar } from "@/contexts/minimal-sidebar-context";
import {
  createFormLocal,
  permanentDeleteFormLocal,
  restoreFormLocal,
} from "@/db-collections/form.collections";
import { createWorkspaceLocal } from "@/db-collections/workspace.collection";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useArchivedForms, useOrgWorkspaces } from "@/hooks/use-live-hooks";
import { settingsDialogStore } from "@/hooks/use-settings-dialog";
import { auth } from "@/lib/auth-client";
import { orgDataForLayoutQueryOptions } from "@/lib/fn/org";
import { HOTKEYS } from "@/lib/hotkeys";
import { cn } from "@/lib/utils";
import { authMiddleware } from "@/middleware/auth";
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { ClientMainArea } from "@/routes/_authenticated/-components/client-main-area";
import { ClientSidebarWorkspaces } from "@/routes/_authenticated/-components/client-sidebar-workspaces";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type * as React from "react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const LazySettingsDialog = lazy(() =>
  import("@/components/settings/settings-dialog").then((m) => ({
    default: m.SettingsDialog,
  })),
);

const AuthLayout = () => {
  const { pathname } = useLocation();
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");

  return (
    <SidebarProvider style={{ "--app-header-height": "40px" } as React.CSSProperties}>
      <EditorHeaderVisibilityProvider enabled={isEditRoute}>
        <MinimalSidebarProvider>
          <AuthLayoutContent />
        </MinimalSidebarProvider>
      </EditorHeaderVisibilityProvider>
    </SidebarProvider>
  );
};

// Route configuration
export const Route = createFileRoute("/_authenticated")({
  server: {
    middleware: [authMiddleware],
  },
  component: AuthLayout,
  loader: async ({ context }) => {
    const { activeOrg, orgsData } = await context.queryClient.ensureQueryData({
      ...orgDataForLayoutQueryOptions(),
      revalidateIfStale: true,
    });
    return { activeOrg, orgsData };
  },
  staleTime: 500000, // 500 seconds
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  ssr: true,
});

const AuthLayoutContent = () => (
  <>
    <AppSidebar />
    <SidebarInbox />
    <SidebarInset className="overflow-hidden relative flex flex-col h-screen">
      <ClientMainArea />
    </SidebarInset>
  </>
);

// Minimal Sidebar Item Component (Figma system-flat: form list item with icon, title, optional count)
// App Sidebar Component using shadcn/ui
// Minimal Sidebar Item Component (Figma system-flat: form list item with icon, title, optional count)
// App Sidebar Component using shadcn/ui
const AppSidebar = () => {
  const { toggleSidebar } = useSidebar();
  const { isInboxOpen, toggleInbox } = useMinimalSidebar();
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    toggle: togglePalette,
    isOpen: isPaletteOpen,
    setIsOpen: setIsPaletteOpen,
  } = useCommandPalette();

  const handleOpenSettings = useCallback(() => settingsDialogStore.open(), []);

  const handleOpenTrash = useCallback(() => setTrashDialogOpen(true), []);

  // Trash dialog state
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);

  // Get pre-fetched data from route loader for immediate render
  const { activeOrg, orgsData } = Route.useLoaderData();

  const { data: invitations } = useQuery(auth.organization.listUserInvitations.queryOptions());
  const pendingCount = (invitations ?? []).filter(
    (inv: { status: string }) => inv.status === "pending",
  ).length;

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        localStorage.removeItem("electricAuthToken");
        router.invalidate();
        router.navigate({ to: "/" });
      },
    }),
  );

  const setActiveOrgMutation = useMutation(
    auth.organization.setActive.mutationOptions({
      onSuccess: async () => {
        // Invalidate and wait for refetch before navigating
        await queryClient.invalidateQueries({
          queryKey: ["organization", "getFullOrganization"],
          refetchType: "all",
        });
        await queryClient.invalidateQueries({
          queryKey: ["workspaces-with-forms"],
          refetchType: "all",
        });
        router.navigate({ to: "/dashboard" });
      },
    }),
  );

  // Set active organization if user has orgs but none is active (runs for all auth routes)
  // orgsData comes from the server loader (session already validated), no need to gate on client session
  useEffect(() => {
    if (!activeOrg && orgsData && orgsData.length > 0) {
      setActiveOrgMutation.mutate({ organizationId: orgsData[0].id });
    }
  }, [activeOrg, orgsData, setActiveOrgMutation]);

  useHotkey(HOTKEYS.TOGGLE_COMMAND_PALETTE, () => togglePalette(), {
    ignoreInputs: true,
  });

  return (
    <>
      <Sidebar className="border-r-[0.5px] bg-background h-screen">
        <SidebarHeader className="h-12 pl-2 pr-2 pt-2 pb-0 flex flex-row items-center">
          <Tooltip>
            <TooltipTrigger render={<LogoToggle direction="left" onClick={toggleSidebar} />} />
            <TooltipContent side="bottom" align="start">
              <p>Collapse sidebar</p>
              <p className="text-xs text-muted-foreground">
                {formatForDisplay(HOTKEYS.DISMISS_SIDEBARS)}
              </p>
            </TooltipContent>
          </Tooltip>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="pt-2 py-0">
            <SidebarGroupContent className="">
              {/* Nav items: Figma system-flat node 23504-5047 - pixel-perfect */}
              <SidebarMenu className="gap-0">
                <SidebarMenuItem>
                  <SidebarItem
                    prefix={<HomeIcon className="size-[18px] text-muted-foreground" />}
                    label="All"
                    to="/dashboard"
                    isActive={location.pathname === "/dashboard"}
                  />
                  {/* </SidebarMenuButton> */}
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarItem
                    onClick={togglePalette}
                    prefix={<SearchIcon className="size-[18px] text-muted-foreground" />}
                    label="Search"
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarItem
                    onClick={toggleInbox}
                    isActive={isInboxOpen}
                    prefix={<BellIcon className="size-[18px] text-muted-foreground" />}
                    label="Notifications"
                  >
                    {pendingCount > 0 && (
                      <span className="text-[10px] bg-primary text-primary-foreground py-0.5 rounded-full font-semibold shrink-0 tabular-nums">
                        {pendingCount}
                      </span>
                    )}
                  </SidebarItem>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarItem
                    onClick={handleOpenSettings}
                    prefix={<SettingsIcon className="size-[18px] text-muted-foreground" />}
                    label="Settings"
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-[13px] px-2">
            <ClientSidebarWorkspaces activeOrgId={activeOrg?.id} />
          </div>
        </SidebarContent>

        <SidebarFooter className="p-0 flex shrink-0 flex-col gap-4 py-3 px-2">
          <UserMenuMinimal onOpenTrash={handleOpenTrash} />
        </SidebarFooter>
        {/* <SidebarRail /> */}
      </Sidebar>

      {/* Command Palette - rendered only on client to avoid cmdk React 19 SSR issue */}
      {typeof window !== "undefined" && (
        <CommandDialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
          <Command>
            <CommandInput placeholder="Search for forms and help articles" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={async () => {
                    setIsPaletteOpen(false);
                    if (!activeOrg) return;
                    // Read workspace state directly (client-only context)
                    const { workspaceCollection } =
                      await import("@/db-collections/workspace.collection");
                    const allWorkspaces = [...workspaceCollection.state.values()];
                    const orgWorkspaces = allWorkspaces.filter(
                      (ws) => ws.organizationId === activeOrg.id,
                    );
                    if (orgWorkspaces.length > 0) {
                      const workspaceMatch = location.pathname.match(/\/workspace\/([^/]+)/);
                      const currentWorkspaceId = workspaceMatch?.[1];
                      const targetWorkspace = currentWorkspaceId
                        ? orgWorkspaces.find((ws) => ws.id === currentWorkspaceId) ||
                          orgWorkspaces[0]
                        : orgWorkspaces[0];

                      const newForm = await createFormLocal(targetWorkspace.id);
                      router.navigate({
                        to: "/workspace/$workspaceId/form-builder/$formId/edit",
                        params: {
                          workspaceId: targetWorkspace.id,
                          formId: newForm.id,
                        },
                      });
                    }
                  }}
                >
                  <PlusIcon className="size-4" />
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
                  <PlusIcon className="size-4" />
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
                  <HomeIcon className="size-4" />
                  <span>Go to home</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    settingsDialogStore.open();
                    setIsPaletteOpen(false);
                  }}
                >
                  <SettingsIcon className="size-4" />
                  <span>Go to settings</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setTrashDialogOpen(true);
                    setIsPaletteOpen(false);
                  }}
                >
                  <Trash2Icon className="size-4" />
                  <span>Trash</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    signOutMutation.mutate({});
                    setIsPaletteOpen(false);
                  }}
                >
                  <LogOutIcon className="size-4" />
                  <span>Sign out</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      )}

      {/* Trash Dialog — uses useLiveQuery, must be client-only */}
      <ClientOnly>
        <TrashDialog
          open={trashDialogOpen}
          onOpenChange={setTrashDialogOpen}
          activeOrgId={activeOrg?.id}
        />
      </ClientOnly>

      {/* Settings Dialog */}
      <Suspense fallback={null}>
        <LazySettingsDialog />
      </Suspense>
    </>
  );
};

// Trash Dialog Component
// Trash Dialog Component
const TrashDialog = ({
  open,
  onOpenChange,
  activeOrgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeOrgId?: string;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: archivedFormsData } = useArchivedForms();
  const { data: orgWorkspacesData } = useOrgWorkspaces(activeOrgId);

  // Get archived forms filtered by active organization
  const archivedForms = useMemo(() => {
    if (!activeOrgId || !archivedFormsData || !orgWorkspacesData) return [];

    const orgWorkspaceIds = new Set(orgWorkspacesData.map((ws) => ws.id));

    return archivedFormsData
      .filter((form) => orgWorkspaceIds.has(form.workspaceId))
      .filter(
        (form) => !searchQuery || form.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .toSorted(
        (a, b) =>
          new Date(b.deletedAt || b.updatedAt).getTime() -
          new Date(a.deletedAt || a.updatedAt).getTime(),
      );
  }, [archivedFormsData, orgWorkspacesData, activeOrgId, searchQuery]);

  // Create a map of workspace names
  const workspaceNames = useMemo(() => {
    if (!orgWorkspacesData) return {};
    return orgWorkspacesData.reduce(
      (acc, ws) => {
        acc[ws.id] = ws.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [orgWorkspacesData]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  );

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
            onChange={handleSearchChange}
            className="h-9 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20"
            aria-label="Search trash"
          />
        </div>

        {/* Forms List */}
        <div className="max-h-[400px] overflow-y-auto">
          {archivedForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trash2Icon className="h-10 w-10 mb-3 opacity-30" />
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
                    <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground truncate">
                        {form.title || "Untitled"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">
                        {workspaceNames[form.workspaceId] || "Unknown workspace"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRestore(form.id)}
                      className="h-7 w-7"
                      title="Restore"
                      aria-label="Restore"
                    >
                      <Undo2Icon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handlePermanentDelete(form.id)}
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      title="Delete permanently"
                      aria-label="Delete permanently"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
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
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground"
            aria-label="Help"
          >
            <HelpCircleIcon className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Sidebar Inbox Panel Component
// Sidebar Inbox Panel Component
const SidebarInbox = () => {
  const { isInboxOpen, closeInbox } = useMinimalSidebar();
  const { state } = useSidebar();
  const queryClient = useQueryClient();
  const prevOpenRef = useRef(isInboxOpen);
  const [isExiting, setIsExiting] = useState(false);
  const [applyExitClass, setApplyExitClass] = useState(false);

  // Start exit animation when closing - set isExiting so we keep rendering (prevents flash)
  useEffect(() => {
    if (isInboxOpen) {
      prevOpenRef.current = true;
      setIsExiting(false);
      setApplyExitClass(false);
    } else if (prevOpenRef.current) {
      setIsExiting(true);
      prevOpenRef.current = false;
    }
  }, [isInboxOpen]);

  // Apply exit class after mount so transition runs (visible -> slide out)
  useLayoutEffect(() => {
    if (!isExiting) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setApplyExitClass(true));
    });
    return () => cancelAnimationFrame(id);
  }, [isExiting]);

  // Unmount after transition - use both transitionend and setTimeout fallback (Safari can be unreliable with transitionend)
  const EXIT_DURATION_MS = 250;
  useEffect(() => {
    if (!isExiting) return;
    const timeoutId = setTimeout(() => {
      setIsExiting(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [isExiting]);

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName === "transform") setIsExiting(false);
  }, []);

  // Fetch invitations received by current user
  const { data: invitations } = useQuery(auth.organization.listUserInvitations.queryOptions());

  // Helper to refetch invitations on error (stale data)
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Something went wrong";
    toast.error(message);
    // Refetch to clear stale invitations
    queryClient.invalidateQueries({
      queryKey: auth.organization.listUserInvitations.queryKey(),
    });
  };

  // Accept/Reject mutations
  const acceptMutation = useMutation(
    auth.organization.acceptInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation accepted!");
        queryClient.invalidateQueries({
          queryKey: auth.organization.listUserInvitations.queryKey(),
        });
      },
      onError: handleError,
    }),
  );

  const rejectMutation = useMutation(
    auth.organization.rejectInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation declined");
        queryClient.invalidateQueries({
          queryKey: auth.organization.listUserInvitations.queryKey(),
        });
      },
      onError: handleError,
    }),
  );

  // Keep mounted during "closing" transition - avoid return null before effect sets isExiting (which would cause flash: close → open → close)
  if (!isInboxOpen && !isExiting && !prevOpenRef.current) return null;

  // Only show pending invitations
  const pendingInvitations = (invitations ?? []).filter(
    (inv: { status: string }) => inv.status === "pending",
  );

  return (
    <div
      className={cn(
        "fixed z-40 flex w-80 flex-col bg-background select-none border-r border-foreground/5 top-0 bottom-0",
        "transition-[left,opacity] duration-150 ease-out [[data-resizing]_&]:transition-none",
        state === "expanded" ? "left-(--sidebar-width)" : "left-(--sidebar-width-icon)",
        applyExitClass && "opacity-0",
      )}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Header */}
      <SidebarHeader className="pt-2 pb-3 pl-1 shrink-0 gap-2.25 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base text-foreground pl-2.5">Inbox</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={closeInbox}
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        <div className="px-1 overflow-hidden">
          {/* Invitations Section */}
          {pendingInvitations.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-3 px-2">
                Invitations
              </p>
              <div className="space-y-1 mb-4">
                {pendingInvitations.map((invitation) => {
                  const isProcessing =
                    (acceptMutation.isPending &&
                      acceptMutation.variables?.invitationId === invitation.id) ||
                    (rejectMutation.isPending &&
                      rejectMutation.variables?.invitationId === invitation.id);

                  return (
                    <div
                      key={invitation.id}
                      className="group flex flex-col gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-foreground/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded bg-foreground/5 flex items-center justify-center shrink-0">
                          <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-foreground">
                            You've been invited to join{" "}
                            <span className="font-bold">
                              {(
                                invitation as unknown as {
                                  organization?: { name?: string };
                                }
                              ).organization?.name ?? "an organization"}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                            Role: <span className="capitalize">{invitation.role}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-11">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-3"
                          disabled={isProcessing}
                          onClick={() =>
                            acceptMutation.mutate({
                              invitationId: invitation.id,
                            })
                          }
                        >
                          {acceptMutation.isPending &&
                          acceptMutation.variables?.invitationId === invitation.id
                            ? "Accepting..."
                            : "Accept"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-3"
                          disabled={isProcessing}
                          onClick={() =>
                            rejectMutation.mutate({
                              invitationId: invitation.id,
                            })
                          }
                        >
                          {rejectMutation.isPending &&
                          rejectMutation.variables?.invitationId === invitation.id
                            ? "Declining..."
                            : "Decline"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-center py-8 text-muted-foreground/40">
              <p className="text-base">No other notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
