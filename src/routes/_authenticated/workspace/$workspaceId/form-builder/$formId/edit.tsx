import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { NotFound } from "@/components/ui/not-found";
import { useFormVersionContent } from "@/hooks/use-form-versions";
import { formCollection } from "@/db-collections/form.collections";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { cn } from "@/lib/utils";
import { createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2Icon } from "@/components/ui/icons";
import type { Value } from "platejs";
import { Suspense, lazy, useEffect } from "react";
import { z } from "zod";

const EditorApp = lazy(() => import("../-components/editor-app"));
import { PreviewMode } from "../-components/preview-mode";

const DesignPage = () => {
  const { pathname } = useLocation();
  // Extract formId from pathname to ensure it's always current
  const formIdFromPath = pathname.split("/form-builder/")[1]?.split("/")[0] || "";
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
    useFormVersionContent(isViewingVersion ? (selectedVersionId ?? undefined) : undefined);

  const versionData = versionContentDataArray?.[0];

  const { previewMode } = useEditorSidebar();

  useEffect(() => {
    if (!isVersionHistoryOpen && isViewingVersion) {
      exitVersionView();
    }
  }, [isVersionHistoryOpen, isViewingVersion, exitVersionView]);
  const formatDateTime = (dateString: string) => format(new Date(dateString), "MMM d, h:mm a");

  const versionContent = versionData?.content as Value | undefined;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative bg-background flex flex-col">
        {/* Version viewing banner */}
        {isViewingVersion && (
          <div className="bg-accent/50 border-b border-accent/20 px-4 py-2 flex items-center justify-between shrink-0">
            <span className="text-sm text-accent-800">
              {isLoadingVersionContent ? (
                <span className="flex items-center gap-2">
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Loading version...
                </span>
              ) : versionData?.publishedAt ? (
                <>
                  Viewing version from{" "}
                  <span className="font-semibold">{formatDateTime(versionData.publishedAt)}</span>
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
            previewMode ? "h-full overflow-hidden" : "overflow-y-auto",
          )}
        >
          {previewMode ? (
            <PreviewMode formId={formId} workspaceId={workspaceId} />
          ) : isViewingVersion && isLoadingVersionContent ? (
            <div className="h-full w-full flex items-center justify-center">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              }
            >
              <EditorApp
                key={isViewingVersion ? `version-${selectedVersionId}` : formId}
                formId={formId}
                workspaceId={workspaceId}
                versionContent={isViewingVersion ? versionContent : undefined}
                readOnly={isViewingVersion}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/edit",
)({
  validateSearch: z.object({
    force: z.boolean().optional(), // When true, skip redirect for published forms
    // Embed config params — synced from sidebar, read by PreviewMode
    embedType: z.enum(["standard", "popup", "fullpage"]).catch("standard").optional(),
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
    embedEmojiIcon: z.string().catch("\uD83D\uDC4B").optional(),
    embedEmojiAnimation: z.enum(["wave", "bounce", "pulse"]).catch("wave").optional(),
    embedPopupTrigger: z.enum(["button", "auto", "scroll"]).catch("button").optional(),
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
      let status = cachedForm?.status as "draft" | "published" | "archived" | undefined;

      // Fall back to server fetch if not in collection yet
      if (!status) {
        const result = await context.queryClient.ensureQueryData({
          ...getFormbyIdQueryOption(params.formId),
          revalidateIfStale: true,
        });
        status = result?.form?.status as "draft" | "published" | "archived" | undefined;
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
  ssr: false,
  component: DesignPage,
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
