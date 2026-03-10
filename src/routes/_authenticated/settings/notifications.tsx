import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  component: NotificationsPage,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notifications</h2>
      <p className="text-muted-foreground italic">Notification settings coming soon{"\u2026"}</p>
    </div>
  );
}
