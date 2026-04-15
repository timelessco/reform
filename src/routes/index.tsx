import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { lazy, Suspense } from "react";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { CustomDomainNotFound } from "@/components/ui/custom-domain-not-found";
import { guestMiddleware } from "@/lib/auth/middleware";
import { isAppHost } from "@/lib/server-fn/custom-domain-loader";

const LandingEditor = lazy(() => import("./-components/landing-editor"));

const checkHostIsApp = createServerFn({ method: "GET" }).handler(() => {
  const headers = getRequestHeaders();
  const host = headers.host ?? headers[":authority"] ?? "";
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
    await checkHostIsApp();
    if (typeof window !== "undefined") {
      const { localFormCollection } = await import("@/collections");
      await localFormCollection.preload();
    }
  },
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: CustomDomainNotFound,
});
