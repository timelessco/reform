import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { guestMiddleware } from "@/middleware/auth";

const LandingEditor = lazy(() => import("@/components/landing-editor"));

export const Route = createFileRoute("/")({
  server: {
    middleware: [guestMiddleware],
  },
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function RouteComponent() {
  return (
    <Suspense fallback={<Loader />}>
      <LandingEditor />
    </Suspense>
  );
}
