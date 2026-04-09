import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { guestMiddleware } from "@/lib/auth/middleware";

const LandingEditor = lazy(() => import("./-components/landing-editor"));

const RouteComponent = () => (
  <Suspense fallback={<Loader />}>
    <LandingEditor />
  </Suspense>
);

export const Route = createFileRoute("/")({
  server: {
    middleware: [guestMiddleware],
  },
  loader: async () => {
    if (typeof window !== "undefined") {
      const { localFormCollection } = await import("@/collections");
      await localFormCollection.preload();
    }
  },
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
