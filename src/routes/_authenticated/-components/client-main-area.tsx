import { AppHeader } from "@/components/ui/app-header";
import { ClientOnly } from "@/components/client-only";
import {
  RIGHT_SIDEBAR_WIDTH_DEFAULT,
  RIGHT_SIDEBAR_WIDTH_KEY,
  RIGHT_SIDEBAR_WIDTH_MAX,
  RIGHT_SIDEBAR_WIDTH_MIN,
  RightSidebarResizeHandle,
} from "@/components/ui/right-sidebar-resize-handle";
import { useEditorHeaderVisibility } from "@/contexts/editor-header-visibility-context";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";
import { Outlet, useLocation, useParams } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useState } from "react";

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

const MainAreaFallback = () => (
  <div className="relative z-20 flex-1 min-h-0 overflow-hidden flex">
    <div className="flex-1 min-w-0 flex flex-col z-50">
      <div className="relative z-0 shrink-0">
        {/* AppHeader uses useEditorSidebar (useLiveQuery) — not SSR-safe */}
        <div style={{ height: "var(--app-header-height, 40px)" }} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </div>
    </div>
  </div>
);

const MainAreaContent = () => {
  const { pathname } = useLocation();
  const isEditRoute = pathname.includes("/form-builder/") && pathname.endsWith("/edit");
  const { visible: isHeaderVisible, reportPointerActivity } = useEditorHeaderVisibility();
  const { formId } = useParams({ strict: false });

  const { activeSidebar } = useEditorSidebar();

  const isFormBuilder = pathname.includes("/form-builder/");
  const showEditorSidebar = !!(activeSidebar && isFormBuilder && formId);
  const isDistractionHeaderHidden = isEditRoute && !isHeaderVisible;

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
      {isDistractionHeaderHidden && (
        <div
          className="fixed inset-x-0 top-0 z-1200 h-3 bg-transparent"
          onMouseEnter={reportPointerActivity}
          aria-hidden="true"
        />
      )}
      <div
        className="relative z-20 flex-1 min-h-0 overflow-hidden flex"
        data-resizing={isRightResizing ? "" : undefined}
      >
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

      {/* Right sidebar resize handle */}
      {showEditorSidebar && (
        <RightSidebarResizeHandle
          sidebarWidth={rightSidebarWidth}
          setSidebarWidth={setRightSidebarWidth}
          setIsResizing={setIsRightResizing}
        />
      )}

      {/* Right sidebar panel */}
      <div
        className={cn(
          "fixed top-0 bottom-0 right-0 z-40 overflow-hidden bg-background",
          !isRightResizing && "transition-[width] duration-200 ease-linear",
          "in-data-resizing:transition-none",
          showEditorSidebar && "border-l border-sidebar-border",
          !showEditorSidebar && "pointer-events-none",
        )}
        style={{
          width: showEditorSidebar ? `${rightSidebarWidth}px` : 0,
        }}
      >
        <div className="h-full w-full">
          <Suspense fallback={null}>
            {activeSidebar === "settings" && formId && <LazyFormSettingsSidebar formId={formId} />}
            {activeSidebar === "share" && formId && <LazyShareSummarySidebar formId={formId} />}
            {activeSidebar === "history" && formId && <LazyVersionHistorySidebar formId={formId} />}
            {activeSidebar === "customize" && formId && <LazyCustomizeSidebar formId={formId} />}
          </Suspense>
        </div>
      </div>
    </>
  );
};

export const ClientMainArea = () => (
  <ClientOnly fallback={<MainAreaFallback />}>
    <MainAreaContent />
  </ClientOnly>
);
