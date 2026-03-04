import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { guestMiddleware } from "@/middleware/auth";

const LandingEditor = lazy(() => import("@/components/landing-editor"));

export const Route = createFileRoute("/")({
  server: {
    middleware: [guestMiddleware],
  },
  validateSearch: z.object({
    demo: z.boolean().optional(),
  }),
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

function RouteComponent() {
  return (
    <Suspense fallback={<Loader />}>
      <LandingEditor />
    </Suspense>
  );
}
