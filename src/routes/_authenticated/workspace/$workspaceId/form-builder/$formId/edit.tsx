import { ErrorBoundary } from "@/components/ui/error-boundary";
import { NotFound } from "@/components/ui/not-found";
import { formCollection } from "@/db-collections/form.collections";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

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
  pendingComponent: () => <div>Loading...</div>,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
