import { ClientOnly } from "@/components/client-only";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { SettingsContent } from "@/components/form-builder/settings-content";
import { createFileRoute } from "@tanstack/react-router";

const SettingsPage = () => {
  const { formId } = Route.useParams();
  return (
    <ClientOnly fallback={<Loader />}>
      <SettingsContent formId={formId} />
    </ClientOnly>
  );
};

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/settings",
)({
  component: SettingsPage,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
