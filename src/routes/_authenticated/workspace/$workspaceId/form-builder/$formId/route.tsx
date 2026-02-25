import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { formCollection } from "@/db-collections/form.collections";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { z } from "zod";

interface RedirectError {
  to?: string;
  href?: string;
  isRedirect?: boolean;
  statusCode?: number;
}

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId",
)({
  validateSearch: z.object({
    demo: z.boolean().optional(),
    sidebar: z.string().optional(),
  }),
  // Redirect to appropriate child route based on form status
  beforeLoad: async ({ context, params, location }) => {
    // Only redirect if we're at the exact parent route (no child route)
    const isExactParentRoute =
      location.pathname ===
        `/workspace/${params.workspaceId}/form-builder/${params.formId}` ||
      location.pathname ===
        `/workspace/${params.workspaceId}/form-builder/${params.formId}/`;

    if (isExactParentRoute) {
      try {
        // Try collection first (instant, no network)
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
            // search: { sidebar: "share" }
          });
        } else {
          throw redirect({
            to: "/workspace/$workspaceId/form-builder/$formId/edit",
            params: { workspaceId: params.workspaceId, formId: params.formId },
          });
        }
      } catch (error: unknown) {
        // If it's a redirect (TanStack Router throws redirect objects), rethrow it
        // Redirect objects have specific properties like 'to', 'href', or are Response instances
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
        // On error, default to edit route
        console.error(
          "[route.tsx beforeLoad] Error fetching form, defaulting to edit:",
          error,
        );
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
});

function FormLayout() {
  const { pathname } = useLocation();
  // Extract formId from pathname to ensure it's always current
  const formIdFromPath =
    pathname.split("/form-builder/")[1]?.split("/")[0] || "";
  const params = Route.useParams();
  const formId = formIdFromPath || params.formId;

  // Hide header on edit route (editor has its own full-screen layout)
  const isEditRoute =
    pathname.includes("/form-builder/") && pathname.includes("/edit");
  // For edit route, render without header
  if (isEditRoute) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
          <Outlet key={formId} />
        </main>
      </div>
    );
  }

  // Non-edit routes (submissions, settings, etc.) - full-width layout
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <main className="flex-1 min-h-0 min-w-0 overflow-auto relative">
        <Outlet key={formId} />
      </main>
    </div>
  );
}
