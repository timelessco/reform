import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { NotFound } from "@/components/ui/not-found";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useFormVersionContent } from "@/hooks/use-form-versions";
import { formCollection } from "@/db-collections/form.collections";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { cn } from "@/lib/utils";
import { createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { Value } from "platejs";
import { useEffect } from "react";
import { z } from "zod";
import EditorApp from "../-components/editor-app";
import { PreviewMode } from "../-components/preview-mode";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/edit",
)({
  validateSearch: z.object({
    demo: z.boolean().optional(),
    force: z.boolean().optional(), // When true, skip redirect for published forms
    sidebar: z.string().optional(),
    // Embed config params — synced from sidebar, read by PreviewMode
    embedType: z
      .enum(["standard", "popup", "fullpage"])
      .catch("standard")
      .optional(),
    embedHeight: z.coerce.number().catch(558).optional(),
    embedDynamicHeight: z.coerce.boolean().catch(true).optional(),
    embedHideTitle: z.coerce.boolean().catch(false).optional(),
    embedAlignLeft: z.coerce.boolean().catch(false).optional(),
    embedTransparent: z.coerce.boolean().catch(false).optional(),
    embedBranding: z.coerce.boolean().catch(true).optional(),
    embedPopupPosition: z
      .enum(["bottom-right", "bottom-left", "center"])
      .catch("bottom-right")
      .optional(),
    embedPopupWidth: z.coerce.number().catch(376).optional(),
    embedDarkOverlay: z.coerce.boolean().catch(false).optional(),
    embedEmoji: z.coerce.boolean().catch(true).optional(),
    embedEmojiIcon: z.string().catch("👋").optional(),
    embedEmojiAnimation: z
      .enum(["wave", "bounce", "pulse"])
      .catch("wave")
      .optional(),
    embedPopupTrigger: z
      .enum(["button", "auto", "scroll"])
      .catch("button")
      .optional(),
    embedHideOnSubmit: z.coerce.boolean().catch(false).optional(),
    embedHideOnSubmitDelay: z.coerce.number().catch(0).optional(),
    embedTrackEvents: z.coerce.boolean().catch(false).optional(),
  }),
  // Redirect published forms to submissions (prevents flash of editor)
  beforeLoad: async ({ context, params, search }) => {
    if ((search as any).force === true) return;

    try {
      // Try collection cache first (instant, no network)
      const cachedForm = formCollection.state.get(params.formId);
      let status = cachedForm?.status as
        | "draft"
        | "published"
        | "archived"
        | undefined;

      // Fall back to server fetch if not in collection yet
      if (!status) {
        const result = await context.queryClient.ensureQueryData({
          ...getFormbyIdQueryOption(params.formId),
          revalidateIfStale: true,
        });
        status = result?.form?.status as
          | "draft"
          | "published"
          | "archived"
          | undefined;
      }

      if (status === "published") {
        throw redirect({
          to: "/workspace/$workspaceId/form-builder/$formId/submissions",
          params: { workspaceId: params.workspaceId, formId: params.formId },
        });
      }
    } catch (error: unknown) {
      // Rethrow redirects
      if (
        error instanceof Response ||
        (typeof error === "object" &&
          error !== null &&
          ((error as any).to !== undefined ||
            (error as any).href !== undefined ||
            (error as any).isRedirect === true ||
            [301, 302, 307, 308].includes((error as any).statusCode)))
      ) {
        throw error;
      }
      // On error, allow edit route to load
    }
  },
  component: DesignPage,
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function DesignPage() {
  const { pathname } = useLocation();
  // Extract formId from pathname to ensure it's always current
  const formIdFromPath =
    pathname.split("/form-builder/")[1]?.split("/")[0] || "";
  const params = Route.useParams();
  const { workspaceId } = params;
  const formId = formIdFromPath || params.formId;

  // Version history sidebar state
  const {
    isOpen: isVersionHistoryOpen,
    selectedVersionId,
    isViewingVersion,
    exitVersionView,
  } = useVersionHistorySidebar();

  // Fetch version content when viewing a version
  const { data: versionContentDataArray, isLoading: isLoadingVersionContent } =
    useFormVersionContent(
      isViewingVersion ? (selectedVersionId ?? undefined) : undefined,
    );

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
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Main editor panel */}
        <ResizablePanel
          defaultSize={isVersionHistoryOpen ? "75%" : "100%"}
          minSize="50%"
        >
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background h-full flex flex-col">
            {/* Version viewing banner */}
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
                  key={
                    isViewingVersion ? `version-${selectedVersionId}` : formId
                  }
                  formId={formId}
                  workspaceId={workspaceId}
                  versionContent={isViewingVersion ? versionContent : undefined}
                  readOnly={isViewingVersion}
                />
              )}
            </div>
          </main>
        </ResizablePanel>

        {/* Version history sidebar is now handled in AuthLayout */}
      </ResizablePanelGroup>
    </div>
  );
}
