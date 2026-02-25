import { createLazyFileRoute, useLocation } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { Value } from "platejs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useFormVersionContent } from "@/hooks/use-form-versions";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { cn } from "@/lib/utils";
import EditorApp from "../-components/editor-app";
import { PreviewMode } from "../-components/preview-mode";

export const Route = createLazyFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/edit",
)({
  component: DesignPage,
});

function DesignPage() {
  const { pathname } = useLocation();
  const formIdFromPath = pathname.split("/form-builder/")[1]?.split("/")[0] || "";
  const params = Route.useParams();
  const { workspaceId } = params;
  const formId = formIdFromPath || params.formId;

  const {
    isOpen: isVersionHistoryOpen,
    selectedVersionId,
    isViewingVersion,
    exitVersionView,
  } = useVersionHistorySidebar();

  const { data: versionContentDataArray, isLoading: isLoadingVersionContent } =
    useFormVersionContent(isViewingVersion ? (selectedVersionId ?? undefined) : undefined);

  const versionData = versionContentDataArray?.[0];
  const search = Route.useSearch();
  const demo = search.demo;

  useEffect(() => {
    if (!isVersionHistoryOpen && isViewingVersion) {
      exitVersionView();
    }
  }, [isVersionHistoryOpen, isViewingVersion, exitVersionView]);

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  const versionContent = versionData?.content as Value | undefined;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={isVersionHistoryOpen ? 75 : 100} minSize={50}>
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background h-full flex flex-col">
            {isViewingVersion && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between shrink-0">
                <span className="text-sm text-amber-800">
                  {isLoadingVersionContent ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading version...
                    </span>
                  ) : versionData?.publishedAt ? (
                    <>
                      Viewing version from{" "}
                      <span className="font-semibold">
                        {formatDateTime(versionData.publishedAt)}
                      </span>
                    </>
                  ) : (
                    "Viewing version..."
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={exitVersionView}>
                  Return to editing
                </Button>
              </div>
            )}

            <div
              className={cn(
                "flex-1 overflow-x-hidden",
                demo ? "h-full overflow-hidden" : "overflow-y-auto",
              )}
            >
              {demo ? (
                <PreviewMode formId={formId} workspaceId={workspaceId} />
              ) : isViewingVersion && isLoadingVersionContent ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <EditorApp
                  key={isViewingVersion ? `version-${selectedVersionId}` : formId}
                  formId={formId}
                  workspaceId={workspaceId}
                  versionContent={isViewingVersion ? versionContent : undefined}
                  readOnly={isViewingVersion}
                />
              )}
            </div>
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
