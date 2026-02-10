import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";

export const Route = createFileRoute("/_authenticated/workspace/$workspaceId")({
  component: WorkspaceLayout,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function WorkspaceLayout() {
  const { workspaceId } = Route.useParams();
  return <Outlet key={workspaceId} />;
}
