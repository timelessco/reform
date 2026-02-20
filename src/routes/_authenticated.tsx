import { FormSettingsSidebar } from "@/components/form-builder/form-settings-sidebar";
import { ShareSummarySidebar } from "@/components/form-builder/share-summary-sidebar";
import { VersionHistorySidebar } from "@/components/form-builder/version-history-sidebar";
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
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
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
import { BellIcon, HomeIcon, SearchIcon, SettingsIcon, StarIcon } from "@/components/ui/sidebar-icons";
import { UserMenuMinimal } from "@/components/user-menu-minimal";
import { WorkspaceItemMinimal, type WorkspaceWithForms } from "@/components/workspace-item-minimal";
import {
  EditorHeaderVisibilityProvider,
  useEditorHeaderVisibility,
} from "@/contexts/editor-header-visibility-context";
import { MinimalSidebarProvider, useMinimalSidebar } from "@/contexts/minimal-sidebar-context";
import {
  createFormLocal,
  createWorkspaceLocal,
  deleteWorkspaceLocal,
  duplicateFormById,
  permanentDeleteFormLocal,
  restoreFormLocal,
  updateFormStatus,
  updateWorkspaceName
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
import { orgDataForLayoutQueryOptions } from "@/lib/fn/org";
import { cn } from "@/lib/utils";
import { authMiddleware } from "@/middleware/auth";
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
  ChevronDown,
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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
    // if (typeof window !== "undefined") {
    //   await Promise.all([
    //     workspaceCollection.preload(),
    //     formCollection.preload(),
    //     favoriteCollection.preload(),
    //     // submissionCollection.preload(),
    //     // formVersionCollection.preload(),
    //     // formSettingsCollection.preload(),
    //   ]);
    // }
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
}

function AuthLayoutContent() {
  const location = useLocation();
  const { pathname } = location;
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");
  const { visible: isHeaderVisible, reportPointerActivity } = useEditorHeaderVisibility();
  const [resizeTooltip, setResizeTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const { formId } = useParams({ strict: false }) as { formId?: string };

  // Editor sidebar management
  const navigate = useNavigate();
  const search: any = useSearch({ strict: false });
  const sidebarParam = search.sidebar;
  const { activeSidebar, setActiveSidebar, resetSidebar, closeSidebar } = useEditorSidebar();

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
  const handleDragRef = useRef({ dragging: false, startX: 0, startY: 0 });
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
            className="fixed inset-x-0 top-0 z-[1200] h-3 bg-transparent"
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
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main content panel - non-resizable */}
            <ResizablePanel
              defaultSize={showEditorSidebar ? 70 : 100}
              minSize={70}
              className="transition-all duration-300 ease-in-out"
            >
              <div ref={leftPanelRef} className={cn("flex h-full min-w-0 flex-col z-50")}>
                <Outlet key={formId} />
              </div>
            </ResizablePanel>

            {/* Resize handle - draggable, click to close */}
            <TypedResizableHandle
              className={cn(
                "fixed top-0 bottom-0 left-(--handle-left) -translate-x-1/2 w-px",
                "bg-border/60 z-[999] pointer-events-auto",
                "transition-none duration-0 hover:w-px data-[resize-handle-state=drag]:w-px",
                !showEditorSidebar && "hidden pointer-events-none",
              )}
              ref={handleRef}
              style={{ "--handle-left": `${handleLeft}px` } as React.CSSProperties}
              onDragging={(isDragging: boolean) => {
                handleDragRef.current.dragging = isDragging;
              }}
              onPointerDown={() => {
                handleDragRef.current.dragging = false;
                updateHandleLeft();
              }}
              onPointerMove={() => {
                updateHandleLeft();
              }}
              onPointerUp={() => {
                if (!handleDragRef.current.dragging && activeSidebar) handleCloseSidebar();
                handleDragRef.current.dragging = false;
              }}
              onMouseEnter={(event: any) => {
                setResizeTooltip({ visible: true, x: event.clientX, y: event.clientY });
              }}
              onMouseMove={(event: any) => {
                setResizeTooltip((prev) => ({
                  ...prev,
                  x: event.clientX,
                  y: event.clientY,
                }));
              }}
              onMouseLeave={() => {
                setResizeTooltip((prev) => ({ ...prev, visible: false }));
              }}
            >
              <div
                className={cn(
                  "pointer-events-none fixed",
                  "rounded-md border border-foreground/10 bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-lg",
                  "transition-opacity duration-150",
                  resizeTooltip.visible ? "opacity-100" : "opacity-0",
                )}
                style={{
                  left: resizeTooltip.x - 12,
                  top: resizeTooltip.y + 12,
                  transform: "translateX(-100%)",
                }}
              >
                <div className="leading-4">
                  <div>Close Click</div>
                  <div>Resize Drag</div>
                </div>
              </div>
            </TypedResizableHandle>

            {/* Right sidebar - Settings/Share/History, resizable */}
            <ResizablePanel
              ref={rightPanelRef}
              collapsible
              collapsedSize={0}
              defaultSize={showEditorSidebar ? 40 : 0}
              minSize={30}
              maxSize={50}
              className={cn(
                "h-full overflow-hidden transition-all duration-300 ease-in-out bg-background",
                !showEditorSidebar && "border-none",
              )}
            >
              <div className="h-full w-full">
                {activeSidebar === "settings" && formId && <FormSettingsSidebar formId={formId} />}
                {activeSidebar === "share" && formId && <ShareSummarySidebar formId={formId} />}
                {activeSidebar === "history" && formId && <VersionHistorySidebar formId={formId} />}
                {activeSidebar === "customize" && <CustomizeSidebar />}
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

  const { data: invitations } = useQuery(auth.organization.listUserInvitations.queryOptions());
  const pendingCount = (invitations ?? []).filter((inv: any) => inv.status === "pending").length;

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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePalette();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [togglePalette]);

  return (
    <>
      <Sidebar className="border-r-[0.5px] bg-background h-screen">
        <SidebarHeader className="h-12 pl-3.5 pr-2 pt-2 pb-0 flex flex-row items-center justify-between group/logo">
          <Logo className="h-5.5 w-5.5 text-sidebar-foreground" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleSidebar()}
            className="hover:bg-sidebar-active text-light-gray-400 hover:text-light-gray-900 group-data-[state=collapsed]:hidden"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pt-2 py-0">
            <SidebarGroupContent className="">
              {/* Nav items: Figma system-flat node 23504-5047 - pixel-perfect */}
              <SidebarMenu className="gap-0">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === "/dashboard"}
                    tooltip="All"
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] gap-2 transition-colors hover:bg-sidebar-active data-[active=true]:bg-sidebar-active"
                  >
                    <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center size-5 shrink-0">
                        <HomeIcon className="h-[18px] w-[18px] text-muted-foreground" />
                      </div>
                      <span className="text-[14px] font-medium font-var-medium-14 text-sidebar-nav-text tracking-[0.14px] leading-tight font-case truncate">
                        All
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={togglePalette}
                    tooltip="Search"
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] gap-2 transition-colors hover:bg-sidebar-active"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center size-5 shrink-0">
                        <SearchIcon className="h-[18px] w-[18px] text-muted-foreground" />
                      </div>
                      <span className="text-[14px] font-var-medium-14 text-sidebar-nav-text tracking-[0.14px] leading-tight font-case truncate">
                        Search
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsInboxOpen(!isInboxOpen)}
                    isActive={isInboxOpen}
                    tooltip={pendingCount > 0 ? `Notifications (${pendingCount})` : "Notifications"}
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] gap-2 transition-colors hover:bg-sidebar-active data-[active=true]:bg-sidebar-active"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="relative flex items-center justify-center size-5 shrink-0">
                        <BellIcon className="h-[18px] w-[18px] text-muted-foreground" />
                        {pendingCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background" />
                        )}
                      </div>
                      <span className="text-[14px] font-medium font-var-medium-14 text-sidebar-nav-text tracking-[0.14px] leading-tight font-case truncate flex-1 min-w-0">
                        Notifications
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-[10px] bg-blue-500 text-white  py-0.5 rounded-full font-semibold shrink-0 tabular-nums">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith("/settings")}
                    tooltip="Settings"
                    className="h-[30px] min-w-0 rounded-lg px-2 py-[7px] gap-2 transition-colors hover:bg-sidebar-active data-[active=true]:bg-sidebar-active"
                  >
                    <Link to="/settings/my-account" className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center size-5 shrink-0">
                        <SettingsIcon className="h-[18px] w-[18px] text-muted-foreground" />
                      </div>
                      <span className="text-[14px] font-medium font-var-medium-14 text-sidebar-nav-text tracking-[0.14px] leading-tight font-case truncate">
                        Settings
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-[15px] px-2">
            <SidebarWorkspacesMinimal activeOrgId={activeOrg?.id} />
          </div>
        </SidebarContent>

        <SidebarFooter className="p-0 pt-2 pb-2 flex shrink-0 flex-col gap-4">
          <FreePlanCard />
          <UserMenuMinimal onOpenTrash={() => setTrashDialogOpen(true)} />
        </SidebarFooter>
        {/* <SidebarRail /> */}
      </Sidebar>

      {/* Command Palette */}
      <CommandDialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
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
                    const workspaceMatch = location.pathname.match(/\/workspace\/([^/]+)/);
                    const currentWorkspaceId = workspaceMatch?.[1];
                    const targetWorkspace = currentWorkspaceId
                      ? orgWorkspaces.find((ws) => ws.id === currentWorkspaceId) || orgWorkspaces[0]
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
      </CommandDialog>

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
      workspacesData.filter((ws) => ws.organizationId === activeOrgId).map((ws) => ws.id),
    );

    // Filter forms that belong to org's workspaces
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
  const { data: invitations } = useQuery(auth.organization.listUserInvitations.queryOptions());

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
  const pendingInvitations = (invitations ?? []).filter((inv: any) => inv.status === "pending");

  return (
    <div
      className={cn(
        "fixed z-40 flex w-80 flex-col bg-background select-none border-r border-foreground/5 top-0 bottom-0",
        "transition-[left,opacity] duration-150 ease-out",
        state === "expanded" ? "left-(--sidebar-width)" : "left-(--sidebar-width-icon)",
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
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground leading-tight">
                            You've been invited to join{" "}
                            <span className="font-bold">
                              {(invitation as any).organization?.name ?? "an organization"}
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
                          onClick={() => acceptMutation.mutate({ invitationId: invitation.id })}
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
                          onClick={() => rejectMutation.mutate({ invitationId: invitation.id })}
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
    <div className="shrink-0 overflow-hidden rounded-xl bg-free-plan-card-bg p-3 mx-3 w-[204px] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="shrink-0 size-6 rounded flex items-center justify-center bg-teal-100">
          <Zap
            className="h-3.5 w-3.5 text-teal-700"
            strokeWidth={2}
            fill="currentColor"
          />
        </div>
        <span className="text-[14px] font-medium text-sidebar-foreground">Free Plan</span>
      </div>
      <p className="text-[13px] text-muted-foreground tracking-[0.13px] leading-[1.48] mb-3">
        Try Booster to capture high-quality inbound and outbound leads
      </p>
      <Button
        variant="outline"
        className="w-full h-7 text-[13px] font-medium text-sidebar-foreground bg-background border border-border hover:bg-muted rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
      >
        Try for free
      </Button>
    </div>
  );
}

// Sidebar Section Component (Figma system-flat: External/collapsible section with chevron)
function SidebarSection({
  label,
  children,
  action,
  initialOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className="flex flex-col">
      <div className="group flex items-center justify-between px-1 py-[7px] transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 h-auto p-0 cursor-pointer flex-1 min-w-0 justify-start bg-transparent border-none"
          aria-expanded={isOpen}
        >
          <span className="text-[13px] font-medium text-muted-foreground tracking-[0.26px] truncate">
            {label}
          </span>
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 shrink-0 text-muted-foreground transition-transform duration-200",
              !isOpen && "-rotate-90",
            )}
            strokeWidth={2}
          />
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {action ?? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 hover:bg-sidebar-active text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>

      {isOpen && <div className="flex flex-col">{children}</div>}
    </div>
  );
}

// Workspaces section - uses live queries for real-time sync (Minimal Style)
function SidebarWorkspacesMinimal({ activeOrgId }: { activeOrgId?: string }) {
  const router = useRouter();
  const location = useLocation();
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
  const handleSortChange = (mode: "recent" | "oldest" | "alphabetical" | "manual") => {
    setSortMode(mode);
    localStorage.setItem("sidebar-sort-mode", mode);
  };

  // Use live queries for real-time sync
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces();
  const { data: formsData, isLoading: formsLoading } = useForms();
  const submissionCounts = useSubmissionCounts();

  // Get user's favorite forms
  const favoriteForms = useFavoriteForms(session?.user?.id);

  // Determine if Electric has synced
  const isLoading = workspacesLoading || formsLoading;
  const isElectricReady = !isLoading && workspacesData !== undefined && formsData !== undefined;

  // Combine workspaces with their forms, filtered by active organization
  const workspaces: WorkspaceWithForms[] = useMemo(() => {
    if (!activeOrgId || !isElectricReady) return [];

    const formsByWorkspace = (formsData || []).reduce(
      (acc, form) => {
        if (!acc[form.workspaceId]) acc[form.workspaceId] = [];
        acc[form.workspaceId].push(form);
        return acc;
      },
      {} as Record<string, typeof formsData>,
    );

    return (workspacesData || [])
      .filter((ws) => ws.organizationId === activeOrgId)
      .map((ws) => ({
        ...ws,
        // Sort forms by recently edited (most recent first)
        forms: (formsByWorkspace[ws.id] || []).toSorted((a, b) => {
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
        }),
      }));
  }, [workspacesData, formsData, activeOrgId, isElectricReady, sortMode]);

  // State for workspace dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceWithForms | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState<WorkspaceWithForms | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // State for form delete dialog
  const [formDeleteDialogOpen, setFormDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete || deleteConfirmName !== workspaceToDelete.name) return;
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
        <SidebarSection label="Favorites" initialOpen={favoriteForms.length > 0} action={<></>}>
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

        {/* Workspaces Section - 15px gap to match Figma mt-[15px] */}
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
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  This will permanently delete <strong>"{workspaceToDelete?.name}"</strong> and{" "}
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
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Workspace name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameWorkspace();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
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
}
