import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { getLatestPublishedVersion } from "@/lib/fn/form-versions";
import { getSubmissionsByFormIdQueryOption } from "@/lib/fn/submissions";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions",
)({
  validateSearch: z.object({
    sidebar: z.string().optional(),
    demo: z.boolean().optional(),
  }),
  loader: async ({ context, params }) => {
    const [publishedData, submissionsData] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["publishedFormVersion", params.formId],
        queryFn: () => getLatestPublishedVersion({ data: { formId: params.formId } }),
        revalidateIfStale: true,
      }),
      context.queryClient.ensureQueryData({
        ...getSubmissionsByFormIdQueryOption(params.formId),
        revalidateIfStale: true,
      }),
    ]);

    return { publishedData, submissionsData };
  },
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
