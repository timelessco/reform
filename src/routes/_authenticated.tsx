import { FormSettingsSidebar } from "@/components/form-builder/form-settings-sidebar";
import { ShareSummarySidebar } from "@/components/form-builder/share-summary-sidebar";
import { VersionHistorySidebar } from "@/components/form-builder/version-history-sidebar";
import { useTheme } from "@/components/ThemeProvider";
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
import { Badge } from "@/components/ui/badge";
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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  EditorHeaderVisibilityProvider,
  useEditorHeaderVisibility,
} from "@/contexts/editor-header-visibility-context";
import { MinimalSidebarProvider, useMinimalSidebar } from "@/contexts/minimal-sidebar-context";
import {
  createFormLocal,
  createWorkspaceLocal,
  deleteWorkspaceLocal,
  duplicateForm,
  permanentDeleteFormLocal,
  restoreFormLocal,
  updateFormStatus,
  updateWorkspaceName,
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
import { getUserMembershipsQueryOptions } from "@/lib/fn/workspaces";
import { cn } from "@/lib/utils";
import { authMiddleware } from "@/middleware/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  Copy,
  FileText,
  Filter,
  HelpCircle,
  Home,
  Loader2,
  LogOut,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  Trash2,
  Undo2,
  Users,
  Zap,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

// Route configuration
export const Route = createFileRoute("/_authenticated")({
  server: {
    middleware: [authMiddleware],
  },
  component: AuthLayout,
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

  // Extract route params from URL
  const workspaceMatch = pathname.match(/\/workspace\/([^/]+)/);
  const formMatch = pathname.match(/\/form-builder\/([^/]+)/);
  const workspaceId = workspaceMatch?.[1];
  const formId = formMatch?.[1];

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

  // Bug 4 fix: Imperatively control right panel expand/collapse
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
            formId={formId}
            workspaceId={workspaceId}
            dividerX={handleLeft}
            isSidebarOpen={showEditorSidebar}
            isDistractionHidden={isDistractionHeaderHidden}
          />
        </div>

        <div className="relative z-20 flex-1 min-h-0 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main content panel */}
            <ResizablePanel
              defaultSize={showEditorSidebar ? 70 : 100}
              minSize={70}
              className="transition-all duration-300 ease-in-out"
            >
              <div ref={leftPanelRef} className={cn("flex h-full min-w-0 flex-col z-50")}>
                <Outlet key={formId} />
              </div>
            </ResizablePanel>

            {/* Right sidebar - Editor Sidebars (Settings, Share, History) */}
            <TypedResizableHandle
              className={cn(
                "fixed top-0 bottom-0 left-(--handle-left) -translate-x-1/2 w-px",
                "bg-border/60 z-[999] pointer-events-auto",
                "transition-none duration-0 hover:w-px data-[resize-handle-state=drag]:w-px",
                !showEditorSidebar && "hidden pointer-events-none",
              )}
              ref={handleRef}
              style={{ "--handle-left": `${handleLeft}px` } as React.CSSProperties}
              onPointerDown={(event: any) => {
                handleDragRef.current = {
                  dragging: false,
                  startX: event.clientX,
                  startY: event.clientY,
                };
                updateHandleLeft();
              }}
              onPointerMove={(event: any) => {
                const dx = Math.abs(event.clientX - handleDragRef.current.startX);
                const dy = Math.abs(event.clientY - handleDragRef.current.startY);
                if (dx > 2 || dy > 2) handleDragRef.current.dragging = true;
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
            <ResizablePanel
              ref={rightPanelRef}
              collapsible
              collapsedSize={0}
              defaultSize={showEditorSidebar ?40 : 0}
              minSize={30}
              maxSize={40}
              className={cn(
                "h-full overflow-hidden transition-all duration-300 ease-in-out bg-background",
                !showEditorSidebar && "border-none",
              )}
            >
              <div className="h-full w-full">
                {activeSidebar === "settings" && formId && <FormSettingsSidebar formId={formId} />}
                {activeSidebar === "share" && formId && <ShareSummarySidebar formId={formId} />}
                {activeSidebar === "history" && formId && <VersionHistorySidebar formId={formId} />}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
    </>
  );
}

// Minimal Sidebar Item Component
interface SidebarItemProps {
  to?: string;
  label: string;
  isNested?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  prefix?: React.ReactNode;
}

function SidebarItem({
  to,
  label,
  isNested,
  isActive,
  onClick,
  prefix,
  children,
}: SidebarItemProps & { children?: React.ReactNode }) {
  const Component: React.ElementType = to ? Link : "button";
  const componentProps = to ? { to } : { type: "button" as const };

  return (
    <Component
      {...componentProps}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-lg px-2 py-[7px] text-[14px] transition-colors relative cursor-pointer h-[30px]",
        !isActive && "text-light-gray-800 hover:bg-light-gray-100 dark:text-dark-gray-900 dark:hover:bg-dark-gray-400",
        isActive && "bg-light-gray-100 text-light-gray-800 font-medium dark:bg-dark-gray-300 dark:text-dark-gray-950",
      )}
    >
      <span className="flex items-center gap-2 overflow-hidden flex-1">
        <span className="flex items-center gap-2 flex-1 overflow-hidden">
          <div className="flex items-center justify-center shrink-0">
            {prefix}
          </div>
          <span className="truncate">{label}</span>
        </span>
      </span>
      {children}
    </Component>
  );
}

// App Sidebar Component using shadcn/ui
function AppSidebar() {
  const { toggleSidebar } = useSidebar();
  const { isInboxOpen, setIsInboxOpen } = useMinimalSidebar();
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const {
    toggle: togglePalette,
    isOpen: isPaletteOpen,
    setIsOpen: setIsPaletteOpen,
  } = useCommandPalette();

  // Trash dialog state
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);

  const { data: activeOrg } = useQuery(auth.organization.getFullOrganization.queryOptions());
  const { data: membersData } = useQuery(auth.organization.listMembers.queryOptions());
  const memberCount = membersData?.members?.length ?? 0;
  const { data: workspacesData } = useWorkspaces();

  const { data: invitations } = useQuery(auth.organization.listUserInvitations.queryOptions());
  const pendingCount = (invitations ?? []).filter((inv: any) => inv.status === "pending").length;

  const { data: session } = useSession();

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        router.navigate({ to: "/" });
      },
    }),
  );

  const { data: orgs } = useQuery(auth.organization.list.queryOptions());

  const { data: membershipsData } = useQuery(getUserMembershipsQueryOptions());

  const roleByOrgId = useMemo(() => {
    const map: Record<string, string> = {};
    membershipsData?.memberships?.forEach((m) => {
      map[m.organizationId] = m.role;
    });
    return map;
  }, [membershipsData]);

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

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = activeOrg?.name || session?.user?.name || "User";

  return (
    <>
      <Sidebar className="border-r-[0.5px] border-light-gray-200 bg-white dark:bg-black dark:border-dark-gray-400">
        <SidebarHeader className="h-12 px-4 flex flex-row items-center justify-between group/logo pt-4">
          <span className="text-2xl font-serif italic font-bold tracking-tighter text-light-gray-900 dark:text-dark-gray-950">f.</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleSidebar()}
            className="hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 text-light-gray-400 hover:text-light-gray-900 group-data-[state=collapsed]:hidden"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pt-2">
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === "/dashboard"}
                    tooltip="All"
                    className="h-[30px] rounded-lg px-2 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 transition-colors"
                  >
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <Home className="h-[18px] w-[18px] text-light-gray-800 dark:text-dark-gray-900" strokeWidth={1.5} />
                      <span className="text-[14px] font-medium text-light-gray-800 dark:text-dark-gray-950 tracking-[0.14px]">All</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={togglePalette}
                    tooltip="Search"
                    className="h-[30px] rounded-lg px-2 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 transition-colors"
                  >
                    <Search className="h-[18px] w-[18px] text-light-gray-800 dark:text-dark-gray-900" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-light-gray-800 dark:text-dark-gray-950 tracking-[0.14px]">Search</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsInboxOpen(!isInboxOpen)}
                    isActive={isInboxOpen}
                    tooltip={pendingCount > 0 ? `Notifications (${pendingCount})` : "Notifications"}
                    className="h-[30px] rounded-lg px-2 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 transition-colors"
                  >
                    <div className="relative">
                      <Bell className="h-[18px] w-[18px] text-light-gray-800 dark:text-dark-gray-900" strokeWidth={1.5} />
                      {pendingCount > 0 && (
                        <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <span className="text-[14px] font-medium text-light-gray-800 dark:text-dark-gray-950 tracking-[0.14px]">Notifications</span>
                    {pendingCount > 0 && (
                      <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith("/settings")}
                    tooltip="Settings"
                    className="h-[30px] rounded-lg px-2 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 transition-colors"
                  >
                    <Link to="/settings/my-account" className="flex items-center gap-2">
                      <Settings className="h-[18px] w-[18px] text-light-gray-800 dark:text-dark-gray-900" strokeWidth={1.5} />
                      <span className="text-[14px] font-medium text-light-gray-800 dark:text-dark-gray-950 tracking-[0.14px]">Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="mt-4 px-2">
            <SidebarWorkspacesMinimal activeOrgId={activeOrg?.id} />
          </div>
        </SidebarContent>

        <SidebarFooter>
          <UserMenuMinimal
            session={session}
            activeOrg={activeOrg}
            orgs={orgs}
            displayName={displayName}
            getInitials={getInitials}
            setActiveOrgMutation={setActiveOrgMutation}
            signOutMutation={signOutMutation}
            router={router}
            theme={theme}
            setTheme={setTheme as any}
            onOpenTrash={() => setTrashDialogOpen(true)}
            membersData={membersData}
            roleByOrgId={roleByOrgId}
          />
        </SidebarFooter>
        <SidebarRail />
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

  if (!isInboxOpen) return null;

  // Only show pending invitations
  const pendingInvitations = (invitations ?? []).filter((inv: any) => inv.status === "pending");

  return (
    <div
      className={cn(
        "fixed z-40 flex w-80 flex-col bg-background select-none transition-[left] duration-200 ease-linear border-r border-foreground/5 top-0 bottom-0",
        state === "expanded" ? "left-[var(--sidebar-width)]" : "left-[var(--sidebar-width-icon)]",
      )}
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
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
          >
            <Filter className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
          >
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

// User Menu Component (Minimal Style - Workspace Switcher)
function UserMenuMinimal({
  session,
  activeOrg,
  orgs,
  displayName,
  getInitials,
  setActiveOrgMutation,
  signOutMutation,
  router,
  theme,
  setTheme,
  onOpenTrash,
  membersData,
  roleByOrgId,
}: {
  session: any;
  activeOrg: any;
  orgs: any;
  displayName: string;
  getInitials: (name?: string | null) => string;
  setActiveOrgMutation: any;
  signOutMutation: any;
  router: any;
  theme: string;
  setTheme: (theme: string) => void;
  onOpenTrash: () => void;
  membersData: any;
  roleByOrgId: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-menu-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative user-menu-container px-1 pt-2 pb-1 bg-white dark:bg-black">
      <div className="flex items-center justify-between group/header">
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 py-[7px] h-auto hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 cursor-pointer flex-1 min-w-0"
          aria-label="Toggle user menu"
        >
          <div className="h-6 w-6 rounded-full overflow-hidden bg-light-gray-100 dark:bg-dark-gray-300 flex items-center justify-center text-[10px] font-bold shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <span className="text-[14px] font-medium text-light-gray-800 dark:text-dark-gray-900 truncate flex-1 text-left tracking-[0.14px]">
            {displayName}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-light-gray-400 transition-transform duration-200 shrink-0",
              isOpen && "rotate-180 text-light-gray-900 dark:text-dark-gray-950",
            )}
            strokeWidth={1.5}
          />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-black border border-light-gray-200 dark:border-dark-gray-400 rounded-xl shadow-[0px_4px_16px_rgba(0,0,0,0.08)] p-1.5 z-100 animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[220px]">
          {/* Active Workspace Info */}
          <div className="px-3 py-2 border-b border-light-gray-100 dark:border-dark-gray-300 mb-1.5 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-light-gray-100 dark:bg-dark-gray-300 flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-light-gray-900 dark:text-dark-gray-950 truncate">{displayName}</span>
              <span className="text-[11px] text-light-gray-600">Free Plan · {membersData?.members?.length ?? 0} {membersData?.members?.length === 1 ? "member" : "members"}</span>
            </div>
          </div>

          <div className="px-2 py-1 mb-1.5">
            <p className="text-[10px] font-bold text-light-gray-400 uppercase tracking-widest px-1 mb-1">
              Account
            </p>
            <div className="space-y-0.5">
              <Button
                variant="ghost"
                onClick={() => {
                  router.navigate({ to: "/settings/my-account" });
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-light-gray-600 dark:text-dark-gray-800 hover:text-light-gray-900 dark:hover:text-dark-gray-950 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300"
              >
                <Settings className="h-3 w-3" strokeWidth={1.5} />
                Settings
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-light-gray-600 dark:text-dark-gray-800 hover:text-light-gray-900 dark:hover:text-dark-gray-950 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenTrash();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-light-gray-600 dark:text-dark-gray-800 hover:text-light-gray-900 dark:hover:text-dark-gray-950 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                <span>Trash</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  router.navigate({ to: "/settings/members" });
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-light-gray-600 dark:text-dark-gray-800 hover:text-light-gray-900 dark:hover:text-dark-gray-950 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300"
              >
                <Users className="h-4 w-4" strokeWidth={1.5} />
                <span>Members</span>
              </Button>
            </div>
          </div>

          {/* Team Switcher */}
          <div className="px-2 py-1 mb-1.5">
            <p className="text-[10px] font-bold text-light-gray-400 uppercase tracking-widest px-1 mb-1">
              {session?.user?.email}
            </p>
            <div className="space-y-0.5">
              {orgs?.map((org: any) => {
                const role = roleByOrgId[org.id];
                return (
                  <Button
                    variant="ghost"
                    key={org.id}
                    onClick={() => {
                      setActiveOrgMutation.mutate({ organizationId: org.id });
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 h-auto w-full justify-start hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 group"
                    aria-label={`Switch to ${org.name}`}
                  >
                    <div className="h-5 w-5 rounded bg-light-gray-100 dark:bg-dark-gray-300 flex items-center justify-center text-[9px] font-bold">
                      {getInitials(org.name)}
                    </div>
                    <span className="text-[13px] font-medium text-light-gray-800 dark:text-dark-gray-900 group-hover:text-light-gray-900 dark:group-hover:text-dark-gray-950 flex-1 truncate">{org.name}</span>
                    {role && (
                      <Badge
                        variant={role === "owner" ? "primary" : "outline"}
                        className="text-[9px] px-1.5 py-0 h-4 capitalize"
                      >
                        {role}
                      </Badge>
                    )}
                    {org.id === activeOrg?.id && (
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="h-px bg-foreground/5 my-1" />
          <div className="space-y-0.5 px-1">
            <Button
              variant="ghost"
              onClick={() => {
                signOutMutation.mutate({});
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-2 py-1.5 h-auto justify-start text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Type for workspace with forms from server
type WorkspaceWithForms = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  forms: Array<{
    id: string;
    title: string;
    updatedAt: string;
    workspaceId: string;
    icon?: string | null;
    status: string;
  }>;
};

// Minimal Workspace Item Component
function WorkspaceItemMinimal({
  workspace,
  submissionCounts,
  onRename,
  onDelete,
  onDuplicateForm,
  onDeleteForm,
}: {
  workspace: WorkspaceWithForms;
  submissionCounts: Map<string, number>;
  onRename: () => void;
  onDelete: () => void;
  onDuplicateForm: (form: WorkspaceWithForms["forms"][0]) => void;
  onDeleteForm: (form: WorkspaceWithForms["forms"][0]) => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".workspace-menu-container")) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleCreateForm = async () => {
    setIsCreatingForm(true);
    try {
      const newForm = await createFormLocal(workspace.id);
      router.navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/edit",
        params: { workspaceId: workspace.id, formId: newForm.id },
      });
    } catch (error) {
      console.error("Failed to create form:", error);
    } finally {
      setIsCreatingForm(false);
    }
  };

  return (
    <div className="flex flex-col space-y-0.5">
      <div className="group flex items-center justify-between px-2 py-1.5 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 h-auto p-0 cursor-pointer flex-1 min-w-0 justify-start bg-transparent border-none"
        >
          <div className="relative shrink-0 size-[10px] flex items-center justify-center">
            <ChevronDown
              className={cn(
                "h-2.5 w-2.5 text-light-gray-600 transition-all duration-200",
                !isOpen && "-rotate-90",
              )}
              strokeWidth={2}
            />
          </div>
          <span className="text-[13px] font-medium text-light-gray-600 dark:text-dark-gray-800 tracking-[0.26px]">
            {workspace.name}
          </span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateForm();
            }}
            disabled={isCreatingForm}
            className="h-6 w-6 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 text-light-gray-600 hover:text-light-gray-900"
            title="New form"
          >
            {isCreatingForm ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </Button>
          <div className="relative workspace-menu-container">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="h-6 w-6 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 text-light-gray-600 hover:text-light-gray-900"
              title="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-background border border-foreground/10 rounded-lg shadow-lg p-1 z-50 min-w-32">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Rename</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[12px] text-red-500/70 hover:text-red-500 hover:bg-red-500/5 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col space-y-0.5 mt-0.5">
          {workspace.forms.map((form) => (
            <WorkspaceFormMinimal
              key={form.id}
              form={form}
              workspaceId={workspace.id}
              submissionCount={submissionCounts.get(form.id) || 0}
              onDuplicate={() => onDuplicateForm(form)}
              onDelete={() => onDeleteForm(form)}
            />
          ))}
          {workspace.forms.length === 0 && (
            <span className="text-muted-foreground/30 text-[11px] px-8 py-1 italic">
              No forms yet
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const getFormIcon = (title: string, icon?: string | null) => {
  if (icon && isEmoji(icon)) return (
    <div className="bg-white dark:bg-dark-gray-300 rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-light-gray-200 dark:border-dark-gray-400">
      <span className="text-xs leading-none">{icon}</span>
    </div>
  );

  // Match icons from Figma design
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("contact")) return (
    <div className="bg-white rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-light-gray-200 shadow-sm">
      <Star className="h-3 w-3 text-light-gray-800 fill-light-gray-800" />
    </div>
  );
  if (lowerTitle.includes("employee intake")) return (
    <div className="bg-light-gray-100 rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-light-gray-200">
      <div className="size-2 bg-light-gray-800 rounded-full" style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
    </div>
  );
  if (lowerTitle.includes("onboarding")) return (
    <div className="bg-light-gray-100 rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-light-gray-200">
      <Zap className="h-3 w-3 text-light-gray-800 fill-light-gray-800" strokeWidth={1} />
    </div>
  );

  // Default: sparkle emoji in rounded highlight
  return (
    <div className="bg-white dark:bg-dark-gray-300 rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-light-gray-200 dark:border-dark-gray-400">
      <span className="text-xs leading-none">✨</span>
    </div>
  );
};


function isEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRange = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return str.length <= 4 && emojiRange.test(str);
}

function WorkspaceFormMinimal({
  form,
  workspaceId,
  submissionCount,
  onDuplicate,
  onDelete,
}: {
  form: { id: string; title: string; icon?: string | null; workspaceId: string; status: string };
  workspaceId: string;
  submissionCount: number;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const location = useLocation();
  const to = `/workspace/${workspaceId}/form-builder/${form.id}/edit`;
  const isActive = location.pathname === to;
  const label = form.title || "Untitled";

  const prefix = getFormIcon(label, form.icon);

  const isPublished = form.status === "published";
  const showCount = isPublished && submissionCount > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <SidebarItem label={label} to={to} isActive={isActive} prefix={prefix}>
            {showCount && (
              <span className="text-[11px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                {submissionCount}
              </span>
            )}
          </SidebarItem>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Sidebar Section Component (matches workspace header styling)
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
    <div className="flex flex-col space-y-0.5">
      <div className="group flex items-center justify-between px-2 py-1.5 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 h-auto p-0 cursor-pointer flex-1 min-w-0 justify-start bg-transparent border-none"
          aria-expanded={isOpen}
        >
          <div className="relative shrink-0 size-[10px] flex items-center justify-center">
            <ChevronDown
              className={cn(
                "h-2.5 w-2.5 text-light-gray-600 transition-all duration-200",
                !isOpen && "-rotate-90",
              )}
              strokeWidth={2}
            />
          </div>
          <span className="text-[13px] font-medium text-light-gray-600 dark:text-dark-gray-800 tracking-[0.26px]">
            {label}
          </span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {action ?? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 hover:bg-light-gray-100 dark:hover:bg-dark-gray-300 text-light-gray-600 hover:text-light-gray-900"
            >
              <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>

      {isOpen && <div className="flex flex-col space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
}

// Workspaces section - uses live queries for real-time sync (Minimal Style)
function SidebarWorkspacesMinimal({ activeOrgId }: { activeOrgId?: string }) {
  const router = useRouter();
  const location = useLocation();
  const { data: session } = useSession();

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
  const workspaces = useMemo(() => {
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
        forms: (formsByWorkspace[ws.id] || []).toSorted(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      }));
  }, [workspacesData, formsData, activeOrgId, isElectricReady]);

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
      const newForm = await duplicateForm(form as any);
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
      <div className="space-y-6">
        {/* Favorites Section */}
        <SidebarSection
          label="Favorites"
          initialOpen={favoriteForms.length > 0}
          action={
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          }
        >
          {favoriteForms.length === 0 ? (
            <span className="text-muted-foreground/30 text-[11px] px-2 py-1 italic">
              No favorites yet
            </span>
          ) : (
            favoriteForms.map((form) => {
              const favTo = `/workspace/${form.workspaceId}/form-builder/${form.id}/edit`;
              const isFavActive = location.pathname === favTo;
              return (
                <SidebarItem
                  key={form.id}
                  label={form.title || "Untitled"}
                  to={favTo}
                  isActive={isFavActive}
                  prefix={
                    <div className="bg-white dark:bg-dark-gray-300 rounded-full size-[18px] flex items-center justify-center border-[0.5px] border-light-gray-200 dark:border-dark-gray-400">
                      <Star className="h-3 w-3 text-light-gray-600" strokeWidth={1.5} fill="currentColor" />
                    </div>
                  }
                />
              );
            })
          )}
        </SidebarSection>

        {/* Workspaces Section */}
        <div className="space-y-4 px-1">
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
