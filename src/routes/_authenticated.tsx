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
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { Logo } from "@/components/ui/logo";
import { NotFound } from "@/components/ui/not-found";
import {
  type ImperativePanelHandle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarSection } from "@/components/ui/sidebar-section";
import {
  BellIcon,
  HomeIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
} from "@/components/ui/sidebar-icons";
import { UserMenuMinimal } from "@/components/user-menu-minimal";
import {
  WorkspaceItemMinimal,
  type WorkspaceWithForms,
} from "@/components/workspace-item-minimal";
import {
  EditorHeaderVisibilityProvider,
  useEditorHeaderVisibility,
} from "@/contexts/editor-header-visibility-context";
import {
  MinimalSidebarProvider,
  useMinimalSidebar,
} from "@/contexts/minimal-sidebar-context";
import {
  createFormLocal,
  createWorkspaceLocal,
  deleteWorkspaceLocal,
  duplicateFormById,
  favoriteCollection,
  formCollection,
  formSettingsCollection,
  formVersionCollection,
  permanentDeleteFormLocal,
  restoreFormLocal,
  submissionCollection,
  updateFormStatus,
  updateWorkspaceName,
  workspaceCollection,
} from "@/db-collections";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import {
  useArchivedForms,
  useFavoriteForms,
  useForms,
  useSubmissionCounts,
  useWorkspaces,
} from "@/hooks/use-live-hooks";
import { auth, useSession } from "@/lib/auth-client";
import { HOTKEYS } from "@/lib/hotkeys";
import { orgDataForLayoutQueryOptions } from "@/lib/fn/org";
import { cn } from "@/lib/utils";
import { authMiddleware } from "@/middleware/auth";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import {
  ChevronsLeft,
  FileText,
  Filter,
  HelpCircle,
  Home,
  LogOut,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  Undo2,
  Users,
  Zap,
} from "lucide-react";

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

type SidebarNavLabelProps = {
  icon: React.ReactNode;
  label: string;
};

function SidebarNavLabel({ icon, label }: SidebarNavLabelProps) {
  return (
    <>
      <div className="flex items-center justify-center size-[18px] shrink-0">
        {icon}
      </div>
      <span className="text-sm font-[450] text-sidebar-nav-text tracking-[0.14px] leading-[1.15] font-case truncate">
        {label}
      </span>
    </>
  );
}

// Route configuration
export const Route = createFileRoute("/_authenticated")({
  server: {
    middleware: [authMiddleware],
  },
  component: AuthLayout,
  loader: async ({ context }) => {
    // Pre-fetch org data via ensureQueryData (like my-account pattern)
    const { activeOrg, orgsData } = await context.queryClient.ensureQueryData({
      ...orgDataForLayoutQueryOptions(),
      revalidateIfStale: true,
    });
    // requires browser cookies for auth and server-side preload would fail
    if (typeof window !== "undefined") {
      await Promise.all([
        workspaceCollection.preload(),
        formCollection.preload(),
        favoriteCollection.preload(),
        submissionCollection.preload(),
        formVersionCollection.preload(),
        formSettingsCollection.preload(),
      ]);
    }
    return { activeOrg, orgsData };
  },
  staleTime: 500000, // 500 seconds
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  ssr: "data-only",
});

const TypedResizableHandle = ResizableHandle as any;

function AuthLayout() {
  const { pathname } = useLocation();
  const isEditRoute =
    pathname.includes("/form-builder/") && pathname.endsWith("/edit");

  return (
    <SidebarProvider
      style={{ "--app-header-height": "40px" } as React.CSSProperties}
    >
      <EditorHeaderVisibilityProvider enabled={isEditRoute}>
        <MinimalSidebarProvider>
          <AuthLayoutContent />
        </MinimalSidebarProvider>
      </EditorHeaderVisibilityProvider>
    </SidebarProvider>
  );
}

function AuthLayoutContent() {
  const location = useLocation();
  const { pathname } = location;
  const isEditRoute =
    pathname.includes("/form-builder/") && pathname.endsWith("/edit");
  const { visible: isHeaderVisible, reportPointerActivity } =
    useEditorHeaderVisibility();

  const { formId } = useParams({ strict: false });

  // Editor sidebar management
  const navigate = useNavigate();
  const search: any = useSearch({ strict: false });
  const sidebarParam = search.sidebar;
  const { activeSidebar, setActiveSidebar, resetSidebar, closeSidebar } =
    useEditorSidebar();

  // Close sidebar and update URL to clear sidebar param
  const handleCloseSidebar = useCallback(() => {
    closeSidebar();
    navigate({
      to: ".",
      search: (prev: any) => ({ ...prev, sidebar: "" }),
      replace: true,
    });
  }, [closeSidebar, navigate]);
  const handleRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [handleLeft, setHandleLeft] = useState(0);
  const handleDragRef = useRef({
    dragging: false,
    hasDragged: false,
    startX: 0,
    startY: 0,
  });
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Initialize sidebar state from URL params on mount only
  // Changes should be handled via event handlers (router navigation)
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializedRef.current = true;
    if (sidebarParam) {
      setActiveSidebar(sidebarParam);
    } else {
      resetSidebar();
    }
  }

  const isFormBuilder = pathname.includes("/form-builder/");
  const showEditorSidebar = !!(activeSidebar && isFormBuilder && formId);
  const isDistractionHeaderHidden = isEditRoute && !isHeaderVisible;

  const updateHandleLeft = useCallback(() => {
    const node = leftPanelRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setHandleLeft(rect.right);
  }, []);

  useLayoutEffect(() => {
    updateHandleLeft();
  }, [updateHandleLeft]);

  useEffect(() => {
    const onResize = () => updateHandleLeft();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateHandleLeft]);

  useEffect(() => {
    if (!leftPanelRef.current) return;
    const observer = new ResizeObserver(() => updateHandleLeft());
    observer.observe(leftPanelRef.current);
    return () => observer.disconnect();
  }, [updateHandleLeft]);

  // Imperatively control right panel expand/collapse
  useEffect(() => {
    if (rightPanelRef.current) {
      if (showEditorSidebar) {
        rightPanelRef.current.expand();
      } else {
        rightPanelRef.current.collapse();
      }
    }
  }, [showEditorSidebar]);

  // Bug 2 fix: Sync sidebar state with URL param changes
  useEffect(() => {
    if (sidebarParam && sidebarParam !== activeSidebar) {
      setActiveSidebar(sidebarParam);
    } else if (!sidebarParam && activeSidebar) {
      closeSidebar();
    }
  }, [sidebarParam, activeSidebar, setActiveSidebar, closeSidebar]);

  return (
    <>
      <AppSidebar />
      <SidebarInbox />

      <SidebarInset className="overflow-hidden relative flex flex-col h-screen">
        {isDistractionHeaderHidden && (
          <div
            className="fixed inset-x-0 top-0 z-1200 h-3 bg-transparent"
            onMouseEnter={reportPointerActivity}
            aria-hidden="true"
          />
        )}
        <div className="relative z-0">
          <AppHeader
            dividerX={handleLeft}
            isSidebarOpen={showEditorSidebar}
            isDistractionHidden={isDistractionHeaderHidden}
          />
        </div>

        <div className="relative z-20 flex-1 min-h-0 overflow-hidden">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            {/* Main content panel - non-resizable */}
            <ResizablePanel
              defaultSize={showEditorSidebar ? "70%" : "100%"}
              minSize="50%"
              className="flex-1"
            >
              <div
                ref={leftPanelRef}
                className={cn("flex h-full min-w-0 flex-col z-50")}
              >
                <Outlet key={formId} />
              </div>
            </ResizablePanel>

            {/* Resize handle - draggable, click to close */}
            <TypedResizableHandle
              className={cn(
                "group fixed top-0 bottom-0 left-(--handle-left) -translate-x-1/2 w-px flex items-center h-full",
                "bg-border/60 z-[999] pointer-events-auto",
                "transition-none duration-0 hover:w-px data-[resize-handle-state=drag]:w-px",
                !showEditorSidebar && "hidden pointer-events-none",
              )}
              ref={handleRef}
              style={
                { "--handle-left": `${handleLeft}px` } as React.CSSProperties
              }
              onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
                handleDragRef.current.hasDragged = false;
                handleDragRef.current.dragging = false;
                handleDragRef.current.startX = e.clientX;
              }}
              onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
                // Detect dragging when pointer moves beyond threshold while pressed
                if (e.buttons > 0 && !handleDragRef.current.dragging) {
                  const deltaX = Math.abs(
                    e.clientX - (handleDragRef.current.startX || 0),
                  );
                  if (deltaX > 3) {
                    handleDragRef.current.dragging = true;
                    handleDragRef.current.hasDragged = true;
                  }
                }
              }}
              onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
                const deltaX = Math.abs(
                  e.clientX - (handleDragRef.current.startX || 0),
                );
                // If it was just a click (no drag detected, and mouse barely moved)
                if (
                  !handleDragRef.current.hasDragged &&
                  deltaX < 5 &&
                  activeSidebar
                ) {
                  handleCloseSidebar();
                }
                handleDragRef.current.dragging = false;
                setTimeout(() => {
                  handleDragRef.current.hasDragged = false;
                }, 50);
              }}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -left-3 -translate-x-full",
                  "rounded-md border border-foreground/10 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-lg",
                  "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-0",
                )}
              >
                <div className="leading-4 whitespace-nowrap">
                  <div>Close Click</div>
                  <div>Resize Drag</div>
                </div>
              </div>
            </TypedResizableHandle>

            {/* Right sidebar - Settings/Share/History, resizable */}
            <ResizablePanel
              panelRef={rightPanelRef}
              collapsible
              collapsedSize="0%"
              defaultSize={showEditorSidebar ? "30%" : "0%"}
              minSize="25%"
              maxSize="50%"
              className={cn(
                "h-full overflow-hidden bg-background",
                !showEditorSidebar && "border-none",
              )}
            >
              <div className="h-full w-full">
                <Suspense fallback={null}>
                  {activeSidebar === "settings" && formId && (
                    <LazyFormSettingsSidebar formId={formId} />
                  )}
                  {activeSidebar === "share" && formId && (
                    <LazyShareSummarySidebar formId={formId} />
                  )}
                  {activeSidebar === "history" && formId && (
                    <LazyVersionHistorySidebar formId={formId} />
                  )}
                  {activeSidebar === "customize" && formId && (
                    <LazyCustomizeSidebar formId={formId} />
                  )}
                </Suspense>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
    </>
  );
}

// Minimal Sidebar Item Component (Figma system-flat: form list item with icon, title, optional count)
// App Sidebar Component using shadcn/ui
function AppSidebar() {
  const { toggleSidebar } = useSidebar();
  const { isInboxOpen, setIsInboxOpen } = useMinimalSidebar();
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    toggle: togglePalette,
    isOpen: isPaletteOpen,
    setIsOpen: setIsPaletteOpen,
  } = useCommandPalette();

  // Trash dialog state
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);

  // Get pre-fetched data from route loader for immediate render
  const { activeOrg, orgsData } = Route.useLoaderData();
  const { data: workspacesData } = useWorkspaces();

  const { data: invitations } = useQuery(
    auth.organization.listUserInvitations.queryOptions(),
  );
  const pendingCount = (invitations ?? []).filter(
    (inv: any) => inv.status === "pending",
  ).length;

  const { data: session } = useSession();

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        localStorage.removeItem("electricAuthToken");
        localStorage.clear();
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
  useEffect(() => {
    if (!session?.user) return;
    if (!activeOrg && orgsData && orgsData.length > 0) {
      setActiveOrgMutation.mutate({ organizationId: orgsData[0].id });
    }
  }, [activeOrg, orgsData, session, setActiveOrgMutation]);

  useHotkey(HOTKEYS.TOGGLE_COMMAND_PALETTE, () => togglePalette());

  return (
    <>
      <Sidebar className="border-r-[0.5px] bg-background h-screen">
        <SidebarHeader className="h-12 pl-3.5 pr-2 pt-2 pb-0 flex flex-row items-center justify-between group/logo">
          <Logo className="h-5.5 w-5.5 text-sidebar-foreground" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleSidebar()}
            className="hover:bg-sidebar-active text-light-gray-400 hover:text-light-gray-800 group-data-[state=collapsed]:hidden"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="pt-2 py-0">
            <SidebarGroupContent className="">
              {/* Nav items: Figma system-flat node 23504-5047 - pixel-perfect */}
              <SidebarMenu className="gap-0">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to="/dashboard" />}
                    isActive={location.pathname === "/dashboard"}
                    tooltip="All"
                    className="min-w-0 rounded-lg px-2 py-[7px] [&_svg]:size-[18px] transition-colors hover:bg-sidebar-active data-[active=true]:bg-sidebar-active"
                  >
                    <SidebarNavLabel
                      icon={<HomeIcon className="size-[18px] text-muted-foreground" />}
                      label="All"
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={togglePalette}
                    tooltip="Search"
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] [&_svg]:size-[18px] transition-colors hover:bg-sidebar-active cursor-pointer"
                  >
                    <SidebarNavLabel
                      icon={<SearchIcon className="size-[18px] text-muted-foreground" />}
                      label="Search"
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsInboxOpen(!isInboxOpen)}
                    isActive={isInboxOpen}
                    tooltip={
                      pendingCount > 0
                        ? `Notifications (${pendingCount})`
                        : "Notifications"
                    }
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] [&_svg]:size-[18px] transition-colors hover:bg-sidebar-active data-[active=true]:bg-sidebar-active cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center size-[18px] shrink-0">
                      <BellIcon className="size-[18px] text-muted-foreground" />
                      {pendingCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-blue-500 ring-2 ring-background" />
                      )}
                    </div>
                    <span className="text-sm font-[450] text-sidebar-nav-text tracking-[0.14px] leading-[1.15] font-case truncate flex-1 min-w-0">
                      Notifications
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] bg-blue-500 text-white py-0.5 rounded-full font-semibold shrink-0 tabular-nums">
                        {pendingCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link to="/settings/my-account" />}
                    isActive={location.pathname.startsWith("/settings")}
                    tooltip="Settings"
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] [&_svg]:size-[18px] transition-colors hover:bg-sidebar-active data-[active=true]:bg-sidebar-active cursor-pointer"
                  >
                    <SidebarNavLabel
                      icon={<SettingsIcon className="size-[18px] text-muted-foreground" />}
                      label="Settings"
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-[13px] px-2">
            <SidebarWorkspacesMinimal activeOrgId={activeOrg?.id} />
          </div>
        </SidebarContent>

        <SidebarFooter className="p-0 pt-2 pb-2 flex shrink-0 flex-col gap-4">
          <FreePlanCard />
          <UserMenuMinimal onOpenTrash={() => setTrashDialogOpen(true)} />
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
                    if (activeOrg && workspacesData) {
                      const orgWorkspaces = workspacesData.filter(
                        (ws) => ws.organizationId === activeOrg.id,
                      );
                      if (orgWorkspaces.length > 0) {
                        // Use workspace from URL if available, otherwise use first workspace
                        const workspaceMatch =
                          location.pathname.match(/\/workspace\/([^/]+)/);
                        const currentWorkspaceId = workspaceMatch?.[1];
                        const targetWorkspace = currentWorkspaceId
                          ? orgWorkspaces.find(
                              (ws) => ws.id === currentWorkspaceId,
                            ) || orgWorkspaces[0]
                          : orgWorkspaces[0];

                        const newForm = await createFormLocal(
                          targetWorkspace.id,
                        );
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
                  <Plus className="mr-2 h-4 w-4" />
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
                  <Plus className="mr-2 h-4 w-4" />
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
                  <Home className="mr-2 h-4 w-4" />
                  <span>Go to home</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.navigate({ to: "/settings" });
                    setIsPaletteOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Go to settings</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setTrashDialogOpen(true);
                    setIsPaletteOpen(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Trash</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    signOutMutation.mutate({});
                    setIsPaletteOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
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
    </>
  );
}

// Trash Dialog Component
function TrashDialog({
  open,
  onOpenChange,
  activeOrgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeOrgId?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: archivedFormsData } = useArchivedForms();
  const { data: workspacesData } = useWorkspaces();

  // Get archived forms filtered by active organization
  const archivedForms = useMemo(() => {
    if (!activeOrgId || !archivedFormsData || !workspacesData) return [];

    // Get workspace IDs belonging to active org
    const orgWorkspaceIds = new Set(
      workspacesData
        .filter((ws) => ws.organizationId === activeOrgId)
        .map((ws) => ws.id),
    );

    // Filter forms that belong to org's workspaces
    return archivedFormsData
      .filter((form) => orgWorkspaceIds.has(form.workspaceId))
      .filter(
        (form) =>
          !searchQuery ||
          form.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .toSorted(
        (a, b) =>
          new Date(b.deletedAt || b.updatedAt).getTime() -
          new Date(a.deletedAt || a.updatedAt).getTime(),
      );
  }, [archivedFormsData, workspacesData, activeOrgId, searchQuery]);

  // Create a map of workspace names
  const workspaceNames = useMemo(() => {
    if (!workspacesData) return {};
    return workspacesData.reduce(
      (acc, ws) => {
        acc[ws.id] = ws.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [workspacesData]);

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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
        </div>

        {/* Forms List */}
        <div className="max-h-[400px] overflow-y-auto">
          {archivedForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trash2 className="h-10 w-10 mb-3 opacity-30" />
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
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {form.title || "Untitled"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">
                        {workspaceNames[form.workspaceId] ||
                          "Unknown workspace"}
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
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handlePermanentDelete(form.id)}
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
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
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sidebar Inbox Panel Component
function SidebarInbox() {
  const { isInboxOpen, setIsInboxOpen } = useMinimalSidebar();
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
  const { data: invitations } = useQuery(
    auth.organization.listUserInvitations.queryOptions(),
  );

  // Helper to refetch invitations on error (stale data)
  const handleError = (error: any) => {
    const message = error?.message || "Something went wrong";
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
    (inv: any) => inv.status === "pending",
  );

  return (
    <div
      className={cn(
        "fixed z-40 flex w-80 flex-col bg-background select-none border-r border-foreground/5 top-0 bottom-0",
        "transition-[left,opacity] duration-150 ease-out",
        state === "expanded"
          ? "left-(--sidebar-width)"
          : "left-(--sidebar-width-icon)",
        applyExitClass && "opacity-0",
      )}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-10 border-b border-foreground/5">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold text-foreground">Inbox</h2>
          {pendingInvitations.length > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {pendingInvitations.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsInboxOpen(false)}
            className="h-6 w-7 mr-1"
            title="Collapse"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6">
            <Filter className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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
                      acceptMutation.variables?.invitationId ===
                        invitation.id) ||
                    (rejectMutation.isPending &&
                      rejectMutation.variables?.invitationId === invitation.id);

                  return (
                    <div
                      key={invitation.id}
                      className="group flex flex-col gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-foreground/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded bg-foreground/5 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground leading-tight">
                            You've been invited to join{" "}
                            <span className="font-bold">
                              {(invitation as any).organization?.name ??
                                "an organization"}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                            Role:{" "}
                            <span className="capitalize">
                              {invitation.role}
                            </span>
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

          {/* Older / Other notifications section (for future extensibility) */}
          <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-3 px-2">
            {pendingInvitations.length > 0 ? "Other" : "Notifications"}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-center py-8 text-muted-foreground/40">
              <p className="text-xs">No other notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Free Plan Card - Figma node 23504-5269 (pixel-perfect)
function FreePlanCard() {
  return (
    <div className="shrink-0 overflow-hidden rounded-xl bg-free-plan-card-bg px-3 pt-[15px] pb-3 mx-[9px] w-[204px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10),0px_0px_1px_0px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-2 mb-3">
        <div className="shrink-0 size-5 p-1 flex items-center justify-center bg-teal-100 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <title>Free Plan</title>
            <path
              d="M6.375 1.875L5.625 4.875H10.125L5.625 10.125L6.375 7.125H1.875L6.375 1.875Z"
              fill="#0F736B"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6.60448 1.43079C6.8105 1.53721 6.91632 1.77133 6.86008 1.99629L6.2654 4.37503H10.125C10.3203 4.37503 10.4977 4.4887 10.5793 4.6661C10.6609 4.8435 10.6317 5.05216 10.5046 5.20042L6.00464 10.4504C5.85372 10.6265 5.60156 10.6757 5.39554 10.5693C5.18951 10.4628 5.08369 10.2287 5.13994 10.0038L5.73462 7.62503H1.87501C1.67974 7.62503 1.50234 7.51135 1.42075 7.33395C1.33916 7.15655 1.3683 6.94789 1.49538 6.79963L5.99538 1.54963C6.14629 1.37357 6.39845 1.32437 6.60448 1.43079ZM2.96212 6.62503H6.37501C6.52898 6.62503 6.67436 6.69596 6.76911 6.81732C6.86386 6.93868 6.89742 7.09692 6.86008 7.24629L6.62378 8.1915L9.0379 5.37503H5.62501C5.47104 5.37503 5.32566 5.30409 5.2309 5.18273C5.13615 5.06137 5.10259 4.90313 5.13994 4.75376L5.37624 3.80855L2.96212 6.62503Z"
              fill="#0F736B"
            />
          </svg>
        </div>
        <span className="text-[14px] font-medium text-foreground tracking-[0.14px] leading-[1.46]">
          Free Plan
        </span>
      </div>
      <p
        className="text-[13px] font-normal leading-[1.48] tracking-[0.13px] mb-4 mr-3 text-muted-foreground"
      >
        Try Booster to capture high-quality inbound and outbound leads
      </p>
      <Button
        variant="secondary"
        className="w-full h-7 text-sm px-1.5 font-medium text-accent-foreground bg-background hover:bg-muted rounded-lg shadow cursor-pointer"
      >
        Try for free
      </Button>
    </div>
  );
}

// Workspaces section - uses live queries for real-time sync (Minimal Style)
function SidebarWorkspacesMinimal({ activeOrgId }: { activeOrgId?: string }) {
  const router = useRouter();
  const location = useLocation();
  const { data: session } = useSession();

  // Sort mode state with localStorage persistence
  const [sortMode, setSortMode] = useState<
    "recent" | "oldest" | "alphabetical" | "manual"
  >(() => {
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
  const handleSortChange = (
    mode: "recent" | "oldest" | "alphabetical" | "manual",
  ) => {
    setSortMode(mode);
    localStorage.setItem("sidebar-sort-mode", mode);
  };

  // Use live queries for real-time sync
  const { data: workspacesData, isLoading: workspacesLoading } =
    useWorkspaces();
  const { data: formsData, isLoading: formsLoading } = useForms();
  const submissionCounts = useSubmissionCounts();

  // Get user's favorite forms
  const favoriteForms = useFavoriteForms(session?.user?.id);

  // Determine if Electric has synced
  const isLoading = workspacesLoading || formsLoading;
  const isElectricReady =
    !isLoading && workspacesData !== undefined && formsData !== undefined;

  // Combine workspaces with their forms, filtered by active organization
  const workspaces: WorkspaceWithForms[] = useMemo(() => {
    if (!activeOrgId || !isElectricReady) return [];

    const formsByWorkspace = (formsData || []).reduce(
      (acc, form) => {
        if (!acc[form.workspaceId]) acc[form.workspaceId] = [];
        acc[form.workspaceId].push(form);
        return acc;
      },
      {} as Record<string, WorkspaceWithForms["forms"]>,
    );

    return (workspacesData || [])
      .filter((ws) => ws.organizationId === activeOrgId)
      .map((ws) => ({
        ...ws,
        // Sort forms by recently edited (most recent first)
        forms: (formsByWorkspace[ws.id] || []).toSorted(
          (
            a: WorkspaceWithForms["forms"][0],
            b: WorkspaceWithForms["forms"][0],
          ) => {
            switch (sortMode) {
              case "oldest":
                return (
                  new Date(a.updatedAt).getTime() -
                  new Date(b.updatedAt).getTime()
                );
              case "alphabetical":
                return (a.title || "").localeCompare(b.title || "");
              case "manual":
                return 0;
              case "recent":
              default:
                return (
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
                );
            }
          },
        ),
      }));
  }, [workspacesData, formsData, activeOrgId, isElectricReady, sortMode]);

  // State for workspace dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] =
    useState<WorkspaceWithForms | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] =
    useState<WorkspaceWithForms | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // State for form delete dialog
  const [formDeleteDialogOpen, setFormDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete || deleteConfirmName !== workspaceToDelete.name)
      return;
    try {
      await deleteWorkspaceLocal(workspaceToDelete.id);
      setDeleteDialogOpen(false);
      setWorkspaceToDelete(null);
      setDeleteConfirmName("");
      router.navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  };

  const handleRenameWorkspace = async () => {
    if (!workspaceToRename || !newWorkspaceName.trim()) return;
    try {
      await updateWorkspaceName(workspaceToRename.id, newWorkspaceName.trim());
      setRenameDialogOpen(false);
      setWorkspaceToRename(null);
      setNewWorkspaceName("");
    } catch (error) {
      console.error("Failed to rename workspace:", error);
    }
  };

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

  const handleDuplicateForm = async (form: WorkspaceWithForms["forms"][0]) => {
    try {
      const newForm = await duplicateFormById(form.id);
      toast.success("Form duplicated");
      router.navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: newForm.workspaceId, formId: newForm.id },
      });
    } catch (error) {
      console.error("Failed to duplicate form:", error);
      toast.error("Failed to duplicate form");
    }
  };

  const handleDeleteForm = (form: WorkspaceWithForms["forms"][0]) => {
    setFormToDelete({ id: form.id, title: form.title || "Untitled" });
    setFormDeleteDialogOpen(true);
  };

  const handleConfirmDeleteForm = async () => {
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
  };

  return (
    <>
      <div className="flex flex-col">
        {/* Favorites Section */}
        <SidebarSection
          label="Favorites"
          initialOpen={favoriteForms.length > 0}
          action={<></>}
        >
          {favoriteForms.length === 0 ? (
            <span className="text-muted-foreground/50 text-[11px] px-2 py-1 italic">
              No favorites yet
            </span>
          ) : (
            favoriteForms.map((form) => {
              const favTo =
                form.status === "published"
                  ? `/workspace/${form.workspaceId}/form-builder/${form.id}/submissions`
                  : `/workspace/${form.workspaceId}/form-builder/${form.id}/edit`;
              const isFavActive = location.pathname.startsWith(
                `/workspace/${form.workspaceId}/form-builder/${form.id}`,
              );
              return (
                <SidebarItem
                  key={form.id}
                  label={form.title || "Untitled"}
                  to={favTo}
                  isActive={isFavActive}
                  prefix={
                    <div className="bg-form-icon-bg rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-form-icon-border shrink-0">
                      <StarIcon className="h-4.5 w-4.5 fill-foreground text-foreground" />
                    </div>
                  }
                />
              );
            })
          )}
        </SidebarSection>

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
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmName("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription render={<div className="space-y-4" />}>
              <p>
                This will permanently delete{" "}
                <strong>"{workspaceToDelete?.name}"</strong> and{" "}
                <strong>
                  {workspaceToDelete?.forms?.length || 0} form
                  {(workspaceToDelete?.forms?.length || 0) !== 1 ? "s" : ""}
                </strong>{" "}
                within it. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  Type <strong>{workspaceToDelete?.name}</strong> to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Type workspace name to confirm"
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
            <DialogDescription>
              Enter a new name for this workspace.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Workspace name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameWorkspace();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameWorkspace}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Delete Confirmation Dialog */}
      <AlertDialog
        open={formDeleteDialogOpen}
        onOpenChange={setFormDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formToDelete?.title}"? This
              action will move it to trash.
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
}
