import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { formCollection } from "@/db-collections/form.collections";
import { getFormStatus } from "@/lib/fn/forms";
import type { FormStatus } from "@/lib/fn/forms";
import { createFileRoute, isRedirect, Outlet, redirect, useLocation } from "@tanstack/react-router";

const FormLayout = () => {
  const { pathname } = useLocation();
  // Extract formId from pathname to ensure it's always current
  const formIdFromPath = pathname.split("/form-builder/")[1]?.split("/")[0] || "";
  const params = Route.useParams();
  const formId = formIdFromPath || params.formId;

  // Hide header on edit route (editor has its own full-screen layout)
  const isEditRoute = pathname.includes("/form-builder/") && pathname.includes("/edit");
  // For edit route, render without header
  if (isEditRoute) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden relative flex flex-col">
          <Outlet key={formId} />
        </main>
      </div>
    );
  }

  // Non-edit routes (submissions, settings, etc.) - full-width layout
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      <main className="flex-1 min-h-0 min-w-0 overflow-auto relative">
        <Outlet key={formId} />
      </main>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/workspace/$workspaceId/form-builder/$formId")(
  {
    // Redirect to appropriate child route based on form status
    beforeLoad: async ({ context, params, location }) => {
      // Only redirect if we're at the exact parent route (no child route)
      const isExactParentRoute =
        location.pathname === `/workspace/${params.workspaceId}/form-builder/${params.formId}` ||
        location.pathname === `/workspace/${params.workspaceId}/form-builder/${params.formId}/`;

      if (isExactParentRoute) {
        try {
          // Try collection first (instant, no network)
          const cachedForm = formCollection.state.get(params.formId);
          let status = cachedForm?.status as FormStatus | undefined;

          // Fall back to server fetch if not in collection yet
          if (!status) {
            status = await getFormStatus(context.queryClient, params.formId);
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
          if (isRedirect(error)) {
            throw error;
          }
          throw redirect({
            to: "/workspace/$workspaceId/form-builder/$formId/edit",
            params: { workspaceId: params.workspaceId, formId: params.formId },
          });
        }
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    component: FormLayout,
    ssr: false,
    pendingComponent: Loader,
    errorComponent: ErrorBoundary,
    notFoundComponent: NotFound,
  },
);
