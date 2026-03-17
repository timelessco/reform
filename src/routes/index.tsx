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
  loader: async () => {
    if (typeof window !== "undefined") {
      const { localFormCollection } = await import("@/db-collections");
      await localFormCollection.preload();
    }
  },
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

const RouteComponent = () => (
  <Suspense fallback={<Loader />}>
    <LandingEditor />
  </Suspense>
);
