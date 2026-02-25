import { AppHeader } from "@/components/ui/app-header";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
  type ImperativePanelHandle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  EditorHeaderVisibilityProvider,
  useEditorHeaderVisibility,
} from "@/contexts/editor-header-visibility-context";
import { formCollection } from "@/db-collections/form.collections";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { cn } from "@/lib/utils";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import type * as React from "react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";

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

interface RedirectError {
  to?: string;
  href?: string;
  isRedirect?: boolean;
  statusCode?: number;
}

const TypedResizableHandle = ResizableHandle as any;

export const Route = createFileRoute("/_authenticated/workspace/$workspaceId/form-builder/$formId")(
  {
    validateSearch: z.object({
      demo: z.boolean().optional(),
      sidebar: z.enum(["settings", "share", "history", "customize"]).optional(),
    }),
    beforeLoad: async ({ context, params, location }) => {
      const isExactParentRoute =
        location.pathname === `/workspace/${params.workspaceId}/form-builder/${params.formId}` ||
        location.pathname === `/workspace/${params.workspaceId}/form-builder/${params.formId}/`;

      if (isExactParentRoute) {
        try {
          const cachedForm = formCollection.state.get(params.formId);
          let status: "draft" | "published" | "archived" | undefined = cachedForm?.status;

          if (!status) {
            const result = await context.queryClient.ensureQueryData({
              ...getFormbyIdQueryOption(params.formId),
              revalidateIfStale: true,
            });
            if (
              result?.form?.status === "draft" ||
              result?.form?.status === "published" ||
              result?.form?.status === "archived"
            ) {
              status = result.form.status;
            }
          }

          if (status === "published") {
            throw redirect({
              to: "/workspace/$workspaceId/form-builder/$formId/submissions",
              params: { workspaceId: params.workspaceId, formId: params.formId },
            });
          }

          throw redirect({
            to: "/workspace/$workspaceId/form-builder/$formId/edit",
            params: { workspaceId: params.workspaceId, formId: params.formId },
          });
        } catch (error: unknown) {
          const redirectError = error as RedirectError;
          if (
            error instanceof Response ||
            (typeof error === "object" &&
              error !== null &&
              (redirectError.to !== undefined ||
                redirectError.href !== undefined ||
                redirectError.isRedirect === true ||
                redirectError.statusCode === 301 ||
                redirectError.statusCode === 302 ||
                redirectError.statusCode === 307 ||
                redirectError.statusCode === 308))
          ) {
            throw error;
          }

          console.error("[route.tsx beforeLoad] Error fetching form, defaulting to edit:", error);
          throw redirect({
            to: "/workspace/$workspaceId/form-builder/$formId/edit",
            params: { workspaceId: params.workspaceId, formId: params.formId },
          });
        }
      }
    },
    staleTime: 0,
    component: FormLayout,
    ssr: false,
    pendingComponent: Loader,
    errorComponent: ErrorBoundary,
    notFoundComponent: NotFound,
  },
);

function FormLayout() {
  const { pathname } = useLocation();
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");

  return (
    <EditorHeaderVisibilityProvider enabled={isEditRoute}>
      <FormLayoutContent />
    </EditorHeaderVisibilityProvider>
  );
}

function FormLayoutContent() {
  const { pathname } = useLocation();
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");
  const { visible: isHeaderVisible, reportPointerActivity } = useEditorHeaderVisibility();
  const { formId } = Route.useParams();

  const navigate = useNavigate();
  const search = Route.useSearch();
  const sidebarParam = search.sidebar;
  const { activeSidebar, setActiveSidebar, resetSidebar, closeSidebar } = useEditorSidebar();

  const handleCloseSidebar = useCallback(() => {
    closeSidebar();
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, sidebar: "" }),
      replace: true,
    });
  }, [closeSidebar, navigate]);

  const handleRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [handleLeft, setHandleLeft] = useState(0);
  const handleDragRef = useRef({ dragging: false, hasDragged: false, startX: 0, startY: 0 });
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializedRef.current = true;
    if (sidebarParam) {
      setActiveSidebar(sidebarParam);
    } else {
      resetSidebar();
    }
  }

  const showEditorSidebar = !!(activeSidebar && formId);
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

  useEffect(() => {
    if (rightPanelRef.current) {
      if (showEditorSidebar) {
        rightPanelRef.current.expand();
      } else {
        rightPanelRef.current.collapse();
      }
    }
  }, [showEditorSidebar]);

  useEffect(() => {
    if (sidebarParam && sidebarParam !== activeSidebar) {
      setActiveSidebar(sidebarParam);
    } else if (!sidebarParam && activeSidebar) {
      closeSidebar();
    }
  }, [sidebarParam, activeSidebar, setActiveSidebar, closeSidebar]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
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
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={showEditorSidebar ? 70 : 100} minSize={50}>
            <div ref={leftPanelRef} className={cn("flex h-full min-w-0 flex-col z-50")}>
              <Outlet key={formId} />
            </div>
          </ResizablePanel>

          <TypedResizableHandle
            className={cn(
              "group fixed top-0 bottom-0 left-(--handle-left) -translate-x-1/2 w-px flex items-center h-full",
              "bg-border/60 z-[999] pointer-events-auto",
              "transition-none duration-0 hover:w-px data-[resize-handle-state=drag]:w-px",
              !showEditorSidebar && "hidden pointer-events-none",
            )}
            ref={handleRef}
            style={{ "--handle-left": `${handleLeft}px` } as React.CSSProperties}
            onDragging={(isDragging: boolean) => {
              if (isDragging) {
                handleDragRef.current.dragging = true;
                handleDragRef.current.hasDragged = true;
              } else {
                handleDragRef.current.dragging = false;
                setTimeout(() => {
                  handleDragRef.current.hasDragged = false;
                }, 50);
              }
            }}
            onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
              handleDragRef.current.hasDragged = false;
              handleDragRef.current.startX = e.clientX;
            }}
            onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
              const deltaX = Math.abs(e.clientX - (handleDragRef.current.startX || 0));
              if (!handleDragRef.current.hasDragged && deltaX < 5 && activeSidebar) {
                handleCloseSidebar();
              }
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

          <ResizablePanel
            ref={rightPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={showEditorSidebar ? 30 : 0}
            minSize={25}
            maxSize={50}
            className={cn("h-full overflow-hidden bg-background", !showEditorSidebar && "border-none")}
          >
            <div className="h-full w-full">
              <Suspense fallback={null}>
                {activeSidebar === "settings" && formId && <LazyFormSettingsSidebar formId={formId} />}
                {activeSidebar === "share" && formId && <LazyShareSummarySidebar formId={formId} />}
                {activeSidebar === "history" && formId && (
                  <LazyVersionHistorySidebar formId={formId} />
                )}
                {activeSidebar === "customize" && formId && <LazyCustomizeSidebar formId={formId} />}
              </Suspense>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
