import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function SettingsLayout() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 p-12 max-w-5xl mx-auto w-full space-y-8">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-6 border-b">
            <Link
              to="/settings/my-account"
              className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
            >
              My account
            </Link>
            <Link
              to="/settings/notifications"
              className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
            >
              Notifications
            </Link>
            <Link
              to="/settings/members"
              className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
            >
              Members
            </Link>
            <Link
              to="/settings/api-keys"
              className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
            >
              API keys
            </Link>
            <Link
              to="/settings/billing"
              className="pb-3 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground/80 [&.active]:border-foreground [&.active]:text-foreground"
            >
              Billing
            </Link>
          </nav>

          <div className="pt-4">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
