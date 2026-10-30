import { createFileRoute, isNotFound, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { lazy, Suspense } from "react";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { CustomDomainNotFound } from "@/components/ui/custom-domain-not-found";
import { guestMiddleware } from "@/lib/auth/middleware";
import { isAppHost } from "@/lib/server-fn/custom-domain-loader";

const LandingEditor = lazy(() => import("./-components/landing-editor"));

const checkHostIsApp = createServerFn({ method: "GET" }).handler(() => {
  const host = getRequestHost({ xForwardedHost: true });

  if (!isAppHost(host)) {
    throw notFound();
  }

  return { ok: true } as const;
});

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
    try {
      await checkHostIsApp();
    } catch (e) {
      if (isNotFound(e)) throw notFound();
      throw e;
    }

    if (typeof window !== "undefined") {
      // IndexedDB opens asynchronously; warm it here so the gate resolves without a
      // second round trip after the route renders. Best effort: a failed open must reach
      // LocalFormsGate's retryable state, not the route error boundary.
      const { initLocalFormCollection } = await import("@/collections");
      await initLocalFormCollection().catch(() => undefined);
    }
  },
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: CustomDomainNotFound,
});
