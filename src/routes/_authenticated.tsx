import { ThemedFormIcon } from "@/components/icon-picker/icon-picker-preview";
import { SidebarItem } from "@/components/sidebar-item";
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
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  BellIcon,
  CheckIcon,
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
  RIGHT_SIDEBAR_WIDTH_DEFAULT,
  RIGHT_SIDEBAR_WIDTH_KEY,
  RIGHT_SIDEBAR_WIDTH_MAX,
  RIGHT_SIDEBAR_WIDTH_MIN,
  RightSidebarResizeHandle,
} from "@/components/ui/right-sidebar-resize-handle";
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
import { SidebarSection } from "@/components/ui/sidebar-section";
import { UserMenuMinimal } from "./_authenticated/-components/user-menu-minimal";
import type { WorkspaceWithForms } from "./_authenticated/-components/workspace-item-minimal";
import { WorkspaceItemMinimal } from "./_authenticated/-components/workspace-item-minimal";
import {
  EditorHeaderVisibilityProvider,
  useEditorHeaderVisibility,
} from "@/contexts/editor-header-visibility-context";
import { MinimalSidebarProvider, useMinimalSidebar } from "@/contexts/minimal-sidebar-context";
import {
  createFormLocal,
  createWorkspaceLocal,
  deleteWorkspaceLocal,
  initCollections,
  isInitialized as isCollectionsInitialized,
  permanentDeleteFormLocal,
  restoreFormLocal,
  updateFormStatus,
  updateWorkspaceName,
} from "@/collections";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import {
  useArchivedForms,
  useFavoriteForms,
  useOrgForms,
  useOrgWorkspaces,
  useSubmissionCounts,
} from "@/hooks/use-live-hooks";
import { settingsDialogStore } from "@/hooks/use-settings-dialog";
import { auth, useSession } from "@/lib/auth/auth-client";
import {
  addFavorite,
  getFavorites as getFavoritesServer,
  removeFavorite,
} from "@/lib/server-fn/favorites";
import { getFormVersionContent, getFormVersions } from "@/lib/server-fn/form-versions";
import {
  createForm,
  deleteForm,
  getFormListings as getFormListingsServer,
  updateForm,
} from "@/lib/server-fn/forms";
import { useDuplicateForm } from "@/hooks/use-duplicate-form";
import { useSubmissionNotifications } from "@/hooks/use-submission-notifications";
import { orgDataForLayoutQueryOptions } from "@/lib/server-fn/org";
import {
  workspacesCollectionQueryOptions,
  formListingsCollectionQueryOptions,
  favoritesCollectionQueryOptions,
} from "@/lib/server-fn/query-options";
import { getSubmissionsCount } from "@/lib/server-fn/submissions";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "@/lib/server-fn/workspaces";
import { HOTKEYS } from "@/lib/hotkeys";
import { cn } from "@/lib/utils";
import { authMiddleware } from "@/lib/auth/middleware";
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useLocation, useParams, useRouter } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import type * as React from "react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { toast } from "sonner";

const LazySettingsDialog = lazy(() =>
  import("./_authenticated/-components/settings/settings-dialog").then((m) => ({
    default: m.SettingsDialog,
  })),
);
const LazyFormSettingsSidebar = lazy(() =>
  import("@/components/form-builder/form-settings-sidebar").then((m) => ({
    default: m.FormSettingsSidebar,
  })),
);
const LazyShareSummarySidebar = lazy(() =>
  import("@/components/form-builder/share-summary-sidebar").then((m) => ({
    default: m.ShareSummarySidebar,
  })),
);
const LazyVersionHistorySidebar = lazy(() =>
  import("@/components/form-builder/version-history-sidebar").then((m) => ({
    default: m.VersionHistorySidebar,
  })),
);
const LazyCustomizeSidebar = lazy(() =>
  import("@/components/ui/customize-sidebar").then((m) => ({
    default: m.CustomizeSidebar,
  })),
);

const formatNotificationTime = (value: string) =>
  formatDistanceToNow(new Date(value), {
    addSuffix: true,
  });

const initCollectionsOnClient = createClientOnlyFn(async (queryClient: QueryClient) => {
  if (isCollectionsInitialized()) return;

  await initCollections(queryClient, {
    getWorkspacesWithForms: async () => {
      const result = await getWorkspaces();
      return {
        workspaces: result.workspaces.map(
          // oxlint-disable-next-line typescript-eslint/no-explicit-any -- server type bridge
          (ws: any) => ({
            ...ws,
            forms: [],
          }),
        ),
      };
    },
    getFormListings: async () => await getFormListingsServer(),
    getFormDetail: async (formId: string) => {
      const { getFormbyIdQueryOption } = await import("@/lib/server-fn/forms");
      const result = await queryClient.ensureQueryData(getFormbyIdQueryOption(formId));
      // oxlint-disable-next-line typescript-eslint/no-explicit-any -- server type bridge
      return (result as { form?: any })?.form ?? null;
    },
    getFavorites: async () => await getFavoritesServer(),
    getVersionList: async (formId: string) => {
      const result = await getFormVersions({ data: { formId } });
      return result.versions;
    },
    getVersionContent: async (versionId: string) => {
      const result = await getFormVersionContent({ data: { versionId } });
      return result.version;
    },
    getSubmissionsCount: async (formId: string) => {
      const result = await getSubmissionsCount({ data: { formId } });
      return { total: result.total };
    },
    createWorkspace: async (data) => await createWorkspace({ data: data }),
    updateWorkspace: async (data) => await updateWorkspace({ data: data }),
    deleteWorkspace: async (data) => await deleteWorkspace({ data: data }),
    createForm: async (data) => await createForm({ data: data }),
    updateForm: async (data) => await updateForm({ data: data }),
    deleteForm: async (data) => await deleteForm({ data: data }),
    addFavorite: async (data) => await addFavorite({ data }),
    removeFavorite: async (data) => await removeFavorite({ data }),
  });
});

const AuthLayout = () => {
  const queryClient = useQueryClient();
  const [collectionsReady, setCollectionsReady] = useState(isCollectionsInitialized());
  useEffect(() => {
    if (collectionsReady) return;
    let cancelled = false;
    void initCollectionsOnClient(queryClient).then(() => {
      if (!cancelled) setCollectionsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient, collectionsReady]);

  const { pathname } = useLocation();
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");

  if (!collectionsReady) return <Loader />;

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
  loader: async ({ context }) => {
    const [orgResult] = await Promise.all([
      context.queryClient.ensureQueryData({
        ...orgDataForLayoutQueryOptions(),
        revalidateIfStale: true,
      }),
      // Prefetch collection data using the same query keys TanStack DB will use.
      // This seeds the query cache so collections find warm data on init.
      context.queryClient.ensureQueryData(workspacesCollectionQueryOptions()),
      context.queryClient.ensureQueryData(formListingsCollectionQueryOptions()),
      context.queryClient.ensureQueryData(favoritesCollectionQueryOptions()),
    ]);
    return { activeOrg: orgResult.activeOrg, orgsData: orgResult.orgsData };
  },
  staleTime: 500000, // 500 seconds
  component: AuthLayout,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  ssr: "data-only",
});

const AuthLayoutContent = () => {
  const location = useLocation();
  const { pathname } = location;
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");
  const { visible: isHeaderVisible, reportPointerActivity } = useEditorHeaderVisibility();

  const { formId } = useParams({ strict: false });

  // Editor sidebar management
  const { activeSidebar } = useEditorSidebar();

  const isFormBuilder = pathname.includes("/form-builder/");
  // "history" and "customize" sidebars are edit-route-only (derived guard replaces useEffect cleanup)
  const isEditOnlySidebar = activeSidebar === "history" || activeSidebar === "customize";
  const showEditorSidebar = !!(
    activeSidebar &&
    isFormBuilder &&
    formId &&
    (!isEditOnlySidebar || isEditRoute)
  );
  const isDistractionHeaderHidden = isEditRoute && !isHeaderVisible;

  // Right sidebar width state (persisted, like left sidebar)
  const [rightSidebarWidth, _setRightSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return RIGHT_SIDEBAR_WIDTH_DEFAULT;
    const stored = localStorage.getItem(RIGHT_SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (
        !Number.isNaN(parsed) &&
        parsed >= RIGHT_SIDEBAR_WIDTH_MIN &&
        parsed <= RIGHT_SIDEBAR_WIDTH_MAX
      ) {
        return parsed;
      }
    }
    return RIGHT_SIDEBAR_WIDTH_DEFAULT;
  });
  const [isRightResizing, setIsRightResizing] = useState(false);

  const setRightSidebarWidth = useCallback((width: number) => {
    const clamped = Math.round(
      Math.min(RIGHT_SIDEBAR_WIDTH_MAX, Math.max(RIGHT_SIDEBAR_WIDTH_MIN, width)),
    );
    _setRightSidebarWidth(clamped);
    localStorage.setItem(RIGHT_SIDEBAR_WIDTH_KEY, String(clamped));
  }, []);

  return (
    <>
      <AppSidebar />
      <SidebarInbox />

      <SidebarInset
        className="overflow-hidden relative flex flex-col h-screen"
        data-resizing={isRightResizing ? "" : undefined}
      >
        {isDistractionHeaderHidden && (
          <div
            className="fixed inset-x-0 top-0 z-1200 h-3 bg-transparent"
            onMouseEnter={reportPointerActivity}
            aria-hidden="true"
          />
        )}
        <div className="relative z-20 flex-1 min-h-0 overflow-hidden flex">
          {/* Main content - flex-1 auto fills available space */}
          <div
            className={cn(
              "flex-1 min-w-0 flex flex-col z-50",
              !isRightResizing && "transition-[padding] duration-200 ease-linear",
            )}
            style={{
              paddingRight: showEditorSidebar ? rightSidebarWidth : 0,
            }}
          >
            <div className="relative z-0 shrink-0">
              <AppHeader isDistractionHidden={isDistractionHeaderHidden} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <Outlet key={formId} />
            </div>
          </div>
        </div>

        {/* Right sidebar resize handle - fixed overlay */}
        {showEditorSidebar && (
          <RightSidebarResizeHandle
            sidebarWidth={rightSidebarWidth}
            setSidebarWidth={setRightSidebarWidth}
            setIsResizing={setIsRightResizing}
          />
        )}

        {/* Right sidebar - fixed overlay */}
        <div
          className={cn(
            "fixed top-0 bottom-0 right-0 z-40 overflow-hidden bg-background",
            !isRightResizing && "transition-[width] duration-200 ease-linear",
            "[[data-resizing]_&]:transition-none",
            showEditorSidebar && "border-l border-sidebar-border",
            !showEditorSidebar && "pointer-events-none",
          )}
          style={{
            width: showEditorSidebar ? `${rightSidebarWidth}px` : 0,
          }}
        >
          <div className="h-full w-full">
            <Suspense fallback={null}>
              {activeSidebar === "settings" && formId && (
                <LazyFormSettingsSidebar formId={formId} />
              )}
              {activeSidebar === "share" && formId && <LazyShareSummarySidebar formId={formId} />}
              {activeSidebar === "history" && formId && (
                <LazyVersionHistorySidebar formId={formId} />
              )}
              {activeSidebar === "customize" && formId && <LazyCustomizeSidebar formId={formId} />}
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

// Minimal Sidebar Item Component (Figma system-flat: form list item with icon, title, optional count)
// App Sidebar Component using shadcn/ui
// Minimal Sidebar Item Component (Figma system-flat: form list item with icon, title, optional count)
// App Sidebar Component using shadcn/ui
const AppSidebar = () => {
  const { toggleSidebar } = useSidebar();
  const { isInboxOpen, toggleInbox } = useMinimalSidebar();
  const location = useLocation();
  const router = useRouter();
  const {
    toggle: togglePalette,
    isOpen: isPaletteOpen,
    setIsOpen: setIsPaletteOpen,
  } = useCommandPalette();

  const handleOpenSettings = useCallback(() => settingsDialogStore.open(), []);

  const handleOpenTrash = useCallback(() => setTrashDialogOpen(true), []);

  // Trash dialog state
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");

  // Get pre-fetched data from route loader for immediate render
  const { activeOrg } = Route.useLoaderData();
  const { data: workspacesData } = useOrgWorkspaces(activeOrg?.id);
  const { data: formsData } = useOrgForms(activeOrg?.id);
  const { unreadSubmissionCount } = useSubmissionNotifications({ poll: true });
  const { data: invitations } = useQuery(auth.organization.listUserInvitations.queryOptions());
  const pendingInvitationCount = useMemo(
    () => (invitations ?? []).filter((inv: { status: string }) => inv.status === "pending").length,
    [invitations],
  );
  const pendingCount = unreadSubmissionCount + pendingInvitationCount;

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        router.invalidate();
        router.navigate({ to: "/" });
      },
    }),
  );

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
                    linkOptions={{ to: "/dashboard" }}
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
                      <span className="text-[10px] w-4 text-center bg-primary text-primary-foreground py-0.5 rounded-full font-semibold shrink-0 tabular-nums">
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
            <SidebarWorkspacesMinimal activeOrgId={activeOrg?.id} />
          </div>
        </SidebarContent>

        <SidebarFooter className="p-0 flex shrink-0 flex-col gap-4 py-3 px-2">
          <UserMenuMinimal onOpenTrash={handleOpenTrash} />
        </SidebarFooter>
        {/* <SidebarRail /> */}
      </Sidebar>

      {/* Command Palette - rendered only on client to avoid cmdk React 19 SSR issue */}
      {typeof window !== "undefined" && (
        <CommandDialog
          open={isPaletteOpen}
          onOpenChange={(open) => {
            setIsPaletteOpen(open);
            if (!open) setPaletteSearch("");
          }}
        >
          <Command>
            <CommandInput
              placeholder="Search for forms and help articles"
              value={paletteSearch}
              onValueChange={setPaletteSearch}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={async () => {
                    setIsPaletteOpen(false);
                    if (activeOrg && workspacesData) {
                      const orgWorkspaces = workspacesData;
                      if (orgWorkspaces.length > 0) {
                        // Use workspace from URL if available, otherwise use first workspace
                        const workspaceMatch = location.pathname.match(/\/workspace\/([^/]+)/);
                        const currentWorkspaceId = workspaceMatch?.[1];
                        const targetWorkspace = currentWorkspaceId
                          ? orgWorkspaces.find((ws) => ws.id === currentWorkspaceId) ||
                            orgWorkspaces[0]
                          : orgWorkspaces[0];

                        const { form: newForm } = createFormLocal(targetWorkspace.id);
                        router.navigate({
                          to: "/workspace/$workspaceId/form-builder/$formId/edit",
                          params: {
                            workspaceId: targetWorkspace.id,
                            formId: newForm.id,
                          },
                        });
                      }
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
              {paletteSearch.trim().length > 0 && formsData && formsData.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Forms">
                    {formsData.map((form) => (
                      <CommandItem
                        key={form.id}
                        value={`${form.title || "Untitled form"} ${form.id}`}
                        onSelect={() => {
                          setIsPaletteOpen(false);
                          setPaletteSearch("");
                          router.navigate({
                            to: "/workspace/$workspaceId/form-builder/$formId/edit",
                            params: {
                              workspaceId: form.workspaceId,
                              formId: form.id,
                            },
                          });
                        }}
                      >
                        <FileTextIcon className="size-4" />
                        <span>{form.title || "Untitled form"}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
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

      {/* Trash Dialog */}
      <TrashDialog
        open={trashDialogOpen}
        onOpenChange={setTrashDialogOpen}
        activeOrgId={activeOrg?.id}
      />

      {/* Settings Dialog */}
      <Suspense fallback={null}>
        <LazySettingsDialog />
      </Suspense>
    </>
  );
};

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: archivedFormsData } = useArchivedForms();
  const { data: orgWorkspacesData } = useOrgWorkspaces(activeOrgId);

  const archivedForms = useMemo(() => {
    if (!activeOrgId || !archivedFormsData || !orgWorkspacesData) return [];

    const orgWorkspaceIds = new Set(orgWorkspacesData.map((ws) => ws.id));

    return archivedFormsData
      .filter((form) => orgWorkspaceIds.has(form.workspaceId))
      .filter(
        (form) =>
          !searchQuery || (form?.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .toSorted(
        (a, b) =>
          new Date(b.deletedAt || b.updatedAt).getTime() -
          new Date(a.deletedAt || a.updatedAt).getTime(),
      );
  }, [archivedFormsData, orgWorkspacesData, activeOrgId, searchQuery]);

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

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setSelectedIds(new Set());
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((formId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === archivedForms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(archivedForms.map((f) => f.id)));
    }
  }, [selectedIds.size, archivedForms]);

  const removeFromSelection = useCallback((formId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(formId);
      return next;
    });
  }, []);

  const handleRestore = useCallback(
    async (formId: string) => {
      try {
        await restoreFormLocal(formId);
        removeFromSelection(formId);
      } catch (error) {
        console.error("Failed to restore form:", error);
      }
    },
    [removeFromSelection],
  );

  const handlePermanentDelete = useCallback(
    async (formId: string) => {
      try {
        await permanentDeleteFormLocal(formId);
        removeFromSelection(formId);
      } catch (error) {
        console.error("Failed to delete form:", error);
      }
    },
    [removeFromSelection],
  );

  const handleBulkDelete = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => permanentDeleteFormLocal(id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete forms:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds]);

  const hasSelection = selectedIds.size > 0;

  useHotkey("Mod+A", handleSelectAll, {
    enabled: open,
    conflictBehavior: "replace",
    ignoreInputs: true,
  });

  useHotkey("Delete", handleBulkDelete, {
    enabled: open && hasSelection,
    conflictBehavior: "replace",
    ignoreInputs: true,
  });

  useHotkey(
    "Escape",
    () => {
      if (hasSelection) {
        setSelectedIds(new Set());
      } else {
        handleOpenChange(false);
      }
    },
    {
      enabled: open,
      conflictBehavior: "replace",
    },
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[500px] p-0 gap-0 bg-background border-foreground/10"
      >
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
              {archivedForms.map((form) => {
                const isSelected = selectedIds.has(form.id);
                return (
                  <div
                    key={form.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer ${isSelected ? "bg-muted/50" : "hover:bg-muted/50"}`}
                    onClick={() => handleToggleSelect(form.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleToggleSelect(form.id);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center h-5 w-5 rounded shrink-0">
                        {isSelected ? (
                          <div className="flex items-center justify-center h-5 w-5 rounded bg-foreground text-background transition-colors">
                            <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                          </div>
                        ) : (
                          <>
                            <FileTextIcon className="h-4 w-4 text-muted-foreground group-hover:hidden" />
                            <div className="hidden group-hover:flex items-center justify-center h-5 w-5 rounded border border-muted-foreground/30 text-muted-foreground transition-colors">
                              <CheckIcon className="h-3.5 w-3.5" />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-foreground truncate">
                          {form.title || "Untitled"}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 truncate">
                          {workspaceNames[form.workspaceId] || "Unknown workspace"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(form.id);
                        }}
                        className="h-7 w-7"
                        title="Restore"
                        aria-label="Restore"
                      >
                        <Undo2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermanentDelete(form.id);
                        }}
                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                        title="Delete permanently"
                        aria-label="Delete permanently"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — switches between selection actions and info text */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/5 bg-muted/20">
          {hasSelection ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {selectedIds.size === archivedForms.length ? "Deselect all" : "Select all"}
                </button>
                <span className="text-[11px] text-muted-foreground/60">
                  {selectedIds.size} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {isDeleting ? "Deleting..." : "Delete selected"}
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
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
  useIsomorphicLayoutEffect(() => {
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
  const {
    notifications,
    readNotificationCount,
    openNotification,
    clearNotification,
    clearAllReadNotifications,
    isClearingAllRead,
    clearingFormId,
    readingFormId,
  } = useSubmissionNotifications();

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
  const hasNotifications = notifications.length > 0;
  const hasPendingInvitations = pendingInvitations.length > 0;

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
          {hasNotifications && (
            <>
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                  Submissions
                </p>
                {readNotificationCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    disabled={isClearingAllRead}
                    onClick={() => void clearAllReadNotifications()}
                  >
                    {isClearingAllRead ? "Clearing..." : "Clear all read"}
                  </Button>
                ) : null}
              </div>

              <div className="mb-4 flex flex-col gap-px overflow-hidden rounded-lg">
                {notifications.map((notification) => {
                  const isUnread = !notification.isRead && notification.unreadCount > 0;
                  const isBusy =
                    readingFormId === notification.formId || clearingFormId === notification.formId;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className="group flex w-full min-h-8.5 items-center gap-3 bg-secondary pl-2.5 pr-[6px] py-1.75 text-left transition-colors hover:bg-muted/80"
                      onClick={() => void openNotification(notification)}
                      disabled={readingFormId === notification.formId}
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-foreground/5">
                        <ThemedFormIcon
                          icon={notification.formIcon}
                          customization={undefined}
                          size="14"
                          iconSize="8"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-normal">
                          {notification.formTitle || "Untitled"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isUnread ? (
                          <span className="text-[11px] tabular-nums text-foreground">
                            {notification.unreadCount === 1
                              ? "1 new"
                              : `${notification.unreadCount} new`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">
                            {formatNotificationTime(notification.latestSubmissionAt)}
                          </span>
                        )}
                        {notification.isRead ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="h-5 w-5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                            disabled={isBusy}
                            onClick={(event) => {
                              event.stopPropagation();
                              void clearNotification(notification.formId);
                            }}
                            aria-label="Clear notification"
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Invitations Section */}
          {hasPendingInvitations && (
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

          {!hasNotifications && !hasPendingInvitations ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
              <p className="text-base text-muted-foreground/50">No notifications yet</p>
              <p className="max-w-[220px] text-[11px] text-muted-foreground/40">
                Submission notifications appear here for forms where in-app notifications are
                enabled.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Workspaces section - uses live queries for real-time sync (Minimal Style)
// Workspaces section - uses live queries for real-time sync (Minimal Style)
const SidebarWorkspacesMinimal = ({ activeOrgId }: { activeOrgId?: string }) => {
  const router = useRouter();
  const location = useLocation();
  const duplicateForm = useDuplicateForm();
  const { data: session } = useSession();

  // Sort mode state with localStorage persistence
  const [sortMode, setSortMode] = useState<"recent" | "oldest" | "alphabetical" | "manual">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("sidebar-sort-mode") as
          | "recent"
          | "oldest"
          | "alphabetical"
          | "manual") || "recent"
      );
    }
    return "recent";
  });
  const handleSortChange = useCallback((mode: "recent" | "oldest" | "alphabetical" | "manual") => {
    setSortMode(mode);
    localStorage.setItem("sidebar-sort-mode", mode);
  }, []);

  const { data: workspacesData, isLoading: workspacesLoading } = useOrgWorkspaces(activeOrgId);
  const { data: formsData, isLoading: formsLoading } = useOrgForms(activeOrgId);
  const submissionCounts = useSubmissionCounts();

  // Get user's favorite forms
  const favoriteForms = useFavoriteForms(session?.user?.id);

  // Determine if data has loaded
  const isLoading = workspacesLoading || formsLoading;
  const isDataReady = !isLoading && workspacesData !== undefined && formsData !== undefined;

  // Combine workspaces with their forms, filtered by active organization
  const workspaces: WorkspaceWithForms[] = useMemo(() => {
    if (!activeOrgId || !isDataReady) return [];

    const formsByWorkspace = (formsData || []).reduce(
      (acc, form) => {
        if (!acc[form.workspaceId]) acc[form.workspaceId] = [];
        acc[form.workspaceId].push({
          ...form,
          customization: form.customization as Record<string, string> | null | undefined,
        });
        return acc;
      },
      {} as Record<string, WorkspaceWithForms["forms"]>,
    );

    return (workspacesData || []).map((ws) => ({
      ...ws,
      // Sort forms by recently edited (most recent first)
      forms: (formsByWorkspace[ws.id] || []).toSorted(
        (a: WorkspaceWithForms["forms"][0], b: WorkspaceWithForms["forms"][0]) => {
          switch (sortMode) {
            case "oldest":
              return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            case "alphabetical":
              return (a.title || "").localeCompare(b.title || "");
            case "manual":
              return 0;
            case "recent":
            default:
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }
        },
      ),
    }));
  }, [workspacesData, formsData, activeOrgId, isDataReady, sortMode]);

  // State for workspace dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceWithForms | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState<WorkspaceWithForms | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // State for form delete dialog
  const [formDeleteDialogOpen, setFormDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) setDeleteConfirmName("");
  }, []);

  const handleDeleteConfirmNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmName(e.target.value),
    [],
  );

  const handleNewWorkspaceNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNewWorkspaceName(e.target.value),
    [],
  );

  const handleCloseRenameDialog = useCallback(() => setRenameDialogOpen(false), []);

  const handleDeleteWorkspace = useCallback(async () => {
    if (!workspaceToDelete || deleteConfirmName !== workspaceToDelete.name) return;
    try {
      await deleteWorkspaceLocal(workspaceToDelete.id);
      setDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
      setDeleteConfirmName("");
      router.navigate({ to: "/dashboard" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete workspace";
      toast.error(message);
    }
  }, [workspaceToDelete, deleteConfirmName, router]);

  const handleRenameWorkspace = useCallback(async () => {
    if (!workspaceToRename || !newWorkspaceName.trim()) return;
    try {
      await updateWorkspaceName(workspaceToRename.id, newWorkspaceName.trim());
      setRenameDialogOpen(false);
      setWorkspaceToRename(null);
      setNewWorkspaceName("");
    } catch (error) {
      console.error("Failed to rename workspace:", error);
    }
  }, [workspaceToRename, newWorkspaceName]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRenameWorkspace();
      }
    },
    [handleRenameWorkspace],
  );

  const openRenameDialog = (workspace: WorkspaceWithForms) => {
    setWorkspaceToRename(workspace);
    setNewWorkspaceName(workspace.name);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (workspace: WorkspaceWithForms) => {
    setWorkspaceToDelete(workspace);
    setDeleteConfirmName("");
    setDeleteDialogOpen(true);
  };

  const handleDuplicateForm = useCallback(
    async (form: WorkspaceWithForms["forms"][0]) => {
      try {
        await duplicateForm(form.id);
      } catch {
        toast.error("Failed to duplicate form");
      }
    },
    [duplicateForm],
  );

  const handleDeleteForm = useCallback((form: WorkspaceWithForms["forms"][0]) => {
    setFormToDelete({ id: form.id, title: form.title || "Untitled" });
    setFormDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteForm = useCallback(async () => {
    if (!formToDelete) return;
    try {
      await updateFormStatus(formToDelete.id, "archived");
      toast.success("Form deleted");
      // Navigate to dashboard if user is on the deleted form's page
      if (location.pathname.includes(`/form-builder/${formToDelete.id}`)) {
        router.navigate({ to: "/dashboard" });
      }
      setFormDeleteDialogOpen(false);
      setFormToDelete(null);
    } catch (error) {
      console.error("Failed to delete form:", error);
      toast.error("Failed to delete form");
    }
  }, [formToDelete, location.pathname, router]);

  return (
    <>
      <div className="flex flex-col">
        {/* Favorites Section */}
        {favoriteForms.length > 0 && (
          <SidebarSection label="Favorites" initialOpen action={<></>}>
            {favoriteForms.map((form) => {
              const isFavActive = location.pathname.startsWith(
                `/workspace/${form.workspaceId}/form-builder/${form.id}`,
              );
              return (
                <SidebarItem
                  key={form.id}
                  label={form.title || "Untitled"}
                  linkOptions={{
                    to:
                      form.status === "published"
                        ? "/workspace/$workspaceId/form-builder/$formId/submissions"
                        : "/workspace/$workspaceId/form-builder/$formId/edit",
                    params: { workspaceId: form.workspaceId, formId: form.id },
                  }}
                  isActive={isFavActive}
                  prefix={
                    <ThemedFormIcon
                      icon={form.icon}
                      customization={
                        form.customization as Record<string, string> | null | undefined
                      }
                    />
                  }
                />
              );
            })}
          </SidebarSection>
        )}

        <div className="mt-[15px] space-y-4">
          {isLoading ? (
            ["collection-skeleton-1", "collection-skeleton-2"].map((key) => (
              <div key={key} className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {workspaces.map((workspace) => (
                <WorkspaceItemMinimal
                  key={workspace.id}
                  workspace={workspace}
                  submissionCounts={submissionCounts}
                  sortMode={sortMode}
                  onSortChange={handleSortChange}
                  onRename={() => openRenameDialog(workspace)}
                  onDelete={() => openDeleteDialog(workspace)}
                  onDuplicateForm={handleDuplicateForm}
                  onDeleteForm={handleDeleteForm}
                />
              ))}
              {workspaces.length === 0 && (
                <span className="text-muted-foreground/50 text-[11px] px-2 py-1 italic">
                  No workspaces yet
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription render={<div className="space-y-4" />}>
              <p>
                This will permanently delete <strong>"{workspaceToDelete?.name}"</strong> and{" "}
                <strong>
                  {workspaceToDelete?.forms?.length || 0} form
                  {(workspaceToDelete?.forms?.length || 0) !== 1 ? "s" : ""}
                </strong>
                within it. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  Type <strong>{workspaceToDelete?.name}</strong> to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={handleDeleteConfirmNameChange}
                  placeholder="Type workspace name to confirm"
                  aria-label="Type to confirm deletion"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmName !== workspaceToDelete?.name}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Workspace Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>Enter a new name for this workspace.</DialogDescription>
          </DialogHeader>
          <Input
            value={newWorkspaceName}
            onChange={handleNewWorkspaceNameChange}
            placeholder="Workspace name"
            aria-label="Workspace name"
            onKeyDown={handleRenameKeyDown}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRenameDialog}>
              Cancel
            </Button>
            <Button onClick={handleRenameWorkspace}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Delete Confirmation Dialog */}
      <AlertDialog open={formDeleteDialogOpen} onOpenChange={setFormDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.title}"? This action will move it to
              trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteForm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
