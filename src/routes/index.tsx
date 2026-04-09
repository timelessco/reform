import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { getPersistence } from "@/collections/_persistence";
import { initLocalFormCollection, isLocalFormCollectionReady } from "@/collections/local/form";
import { guestMiddleware } from "@/lib/auth/middleware";

const LandingEditor = lazy(() => import("./-components/landing-editor"));

/**
 * Scoped bootstrap for the landing page: the landing editor is the only
 * place in the app that needs the local draft collection synchronously,
 * so SQLite/OPFS init happens here (cold-path) instead of at `__root`
 * where it would block every other route (login, marketing, auth callback).
 */
const RouteComponent = () => {
  const [ready, setReady] = useState(() => isLocalFormCollectionReady());

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    void (async () => {
      const bundle = await getPersistence();
      await initLocalFormCollection(bundle?.persistence ?? null);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) return <Loader />;
  return (
    <Suspense fallback={<Loader />}>
      <LandingEditor />
    </Suspense>
  );
};

export const Route = createFileRoute("/")({
  server: {
    middleware: [guestMiddleware],
  },
  component: RouteComponent,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});
