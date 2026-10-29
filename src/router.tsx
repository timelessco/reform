import { createRouter } from "@tanstack/react-router";
import { DbClient } from "@tanstack/db";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";

import { routeTree } from "./routeTree.gen";
import { NotFound } from "./components/ui/not-found";
import { ErrorBoundary } from "./components/ui/error-boundary";
import Loader from "./components/ui/loader";

export const getRouter = () => {
  const rqContext = TanstackQuery.getContext();
  // One client per router: per request on the server, one per tab in the browser.
  // DB 1.0 SSR preloads live queries against it and dehydrates the results.
  const dbClient = new DbClient();

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorBoundary,
    defaultPendingComponent: Loader,
    context: {
      ...rqContext,
      session: null,
      dbClient,
    },
    defaultPreload: "intent",
    // Let TanStack Query own caching. Without this the router keeps its own
    // 30s cache of preloaded loader results on top of Query's cache, so an
    // intent-preloaded route can serve stale data and bypass Query's freshness.
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
