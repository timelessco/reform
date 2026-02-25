import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/settings",
)({
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
