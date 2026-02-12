import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { Value } from "platejs";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CustomizeSidebar } from "@/components/ui/customize-sidebar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useFormVersionContent } from "@/hooks/use-form-versions";
import { useForm } from "@/hooks/use-live-hooks";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import EditorApp from "../-components/editor-app";
import { PreviewMode } from "../-components/preview-mode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/edit",
)({
  validateSearch: z.object({
    demo: z.boolean().optional(),
    force: z.boolean().optional(), // When true, skip redirect for published forms
    sidebar: z.string().optional(),
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
    embedEmojiIcon: z.string().catch("👋").optional(),
    embedEmojiAnimation: z.enum(["wave", "bounce", "pulse"]).catch("wave").optional(),
    embedPopupTrigger: z.enum(["button", "auto", "scroll"]).catch("button").optional(),
    embedHideOnSubmit: z.coerce.boolean().catch(false).optional(),
    embedHideOnSubmitDelay: z.coerce.number().catch(0).optional(),
    embedTrackEvents: z.coerce.boolean().catch(false).optional(),
  }),
  component: DesignPage,
  // beforeLoad: async ({ context, params }) => {
  // 	console.log('[edit.tsx beforeLoad] Starting with params:', params);
  // 	let data;
  // 	try {
  // 		data = await context.queryClient.ensureQueryData({
  // 			...getFormbyIdQueryOption(params.formId),
  // 			revalidateIfStale: true,
  // 		})
  // 		console.log('[edit.tsx beforeLoad] Form data fetched:', {
  // 			status: data?.form?.status,
  // 			formId: data?.form?.id,
  // 		});
  // 	} catch (error) {
  // 		console.error('[edit.tsx beforeLoad] Error fetching form:', error);
  // 		return { formStatus: 'unknown' };
  // 	}

  // 	const status = data?.form?.status;
  // 	console.log('[edit.tsx beforeLoad] Checking status:', status);

  // 	if (status === 'published') {
  // 		console.log('[edit.tsx beforeLoad] Form is published, redirecting to share...');
  // 		throw redirect({
  // 			to: '/workspace/$workspaceId/form-builder/$formId/share',
  // 			params: {
  // 				workspaceId: params.workspaceId,
  // 				formId: params.formId
  // 			}
  // 		});
  // 	}

  // 	console.log('[edit.tsx beforeLoad] Form is draft, continuing to edit page');
  // 	return { formStatus: status };
  // },
  // loader: async ({ context, params }) => {
  //   try {
  //     const data = await context.queryClient.ensureQueryData({
  //       ...getFormbyIdQueryOption(params.formId),
  //       revalidateIfStale: true,
  //     });
  //     return { initialContent: data.form.content };
  //   } catch {
  //     // Form may not exist on server yet (local-first sync in progress)
  //     // Return empty content - the EditorApp will use local data from Electric
  //     return { initialContent: [] };  
  //   }
  // },
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function DesignPage() {
  const navigate = useNavigate();
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
  const { data: versionContentData, isLoading: isLoadingVersionContent } = useFormVersionContent(
    isViewingVersion ? (selectedVersionId ?? undefined) : undefined,
  );

  // Use local Electric data to check form status (more up-to-date than server)
  const { data: localFormData, isReady } = useForm(formId);
  const localForm = localFormData?.[0];
  const localStatus = localForm?.status;

  console.log("[edit.tsx DesignPage] Local form status check:", {
    formId,
    localStatus,
    isReady,
    localForm: localForm
      ? { id: localForm.id, title: localForm.title, status: localForm.status }
      : null,
  });

  const search = Route.useSearch();
  const demo = search.demo;
  console.log("[edit.tsx DesignPage] Demo:", demo);
  // Check if user explicitly wants to edit (force param from Edit button)
  const forceEdit = search.force === true;

  // Redirect to share page if form is published (using local Electric data)
  // BUT skip redirect if user explicitly clicked "Edit" button (force=true)
  useEffect(() => {
    if (isReady && localStatus === "published" && !forceEdit) {
      navigate({
        to: "/workspace/$workspaceId/form-builder/$formId/submissions",
        params: { workspaceId, formId },
        // search: { sidebar: "share" },
        replace: true, // Replace history entry so back button doesn't loop
      });
    }
  }, [isReady, localStatus, formId, workspaceId, navigate, forceEdit]);

  // Reset version view when sidebar closes (revert to current content)
  useEffect(() => {
    if (!isVersionHistoryOpen && isViewingVersion) {
      exitVersionView();
    }
  }, [isVersionHistoryOpen, isViewingVersion, exitVersionView]);

  // // Show loader while checking form status
  // if (!isReady) {
  //   return <Loader />;
  // }

  // // If form is published and not forcing edit, show loader while redirecting
  // if (localStatus === "published" && !forceEdit) {
  //   return <Loader />;
  // }

  // Format date for version banner
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  const versionContent = versionContentData?.version?.content as Value | undefined;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Main editor panel */}
        <ResizablePanel defaultSize={isVersionHistoryOpen ? 75 : 100} minSize={50}>
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
                  ) : versionContentData?.version?.publishedAt ? (
                    <>
                      Viewing version from{" "}
                      <span className="font-semibold">
                        {formatDateTime(versionContentData.version.publishedAt)}
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

        {/* Version history sidebar is now handled in AuthLayout */}
      </ResizablePanelGroup>
      <CustomizeSidebar />
    </div>
  );
}
