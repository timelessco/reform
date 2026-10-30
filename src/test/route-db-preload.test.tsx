import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/query-core";
import { DbClient } from "@tanstack/db";
import type { DehydratedDbState } from "@tanstack/db";
import { DbProvider, HydrationBoundary } from "@tanstack/react-db";
import { configureFormListings, formListingsDescriptor } from "@/collections/query/form-listing";
import { orgFormsLiveQueryOptions } from "@/collections/query/org-forms";
import { useOrgForms } from "@/hooks/use-live-hooks";
import { getBrowserDbClient, bindBrowserDbClient } from "@/db/db-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * DB 1.0 SSR contract for the org-forms live query: a preload of
 * `orgFormsLiveQueryOptions` against a request-scoped `DbClient` dehydrates, and the
 * REAL `useOrgForms` hook renders those rows on its first browser pass with no extra
 * fetch. No route preloads it today; this pins the hash match for when one does.
 */

const listing = (id: string, title: string) => ({
  id,
  shortId: id,
  title,
  status: "draft",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  workspaceId: "ws-1",
  icon: null,
  formName: "draft",
  submissionCount: 0,
});

const rows = () => [listing("a", "Alpha"), listing("b", "Beta")];

const OrgFormsCount = () => {
  const { data } = useOrgForms();

  const items = data ?? [];

  return (
    <ul data-count={items.length}>
      {items.map((row) => (
        <li key={row.id}>{row.title}</li>
      ))}
    </ul>
  );
};

describe("org-forms live query preload → browser render", () => {
  it("ships the preloaded org-forms snapshot through the real hook with no browser fetch", async () => {
    const serverFetch = vi.fn(async () => rows());
    const browserFetch = vi.fn(async () => rows());

    // --- server: configure the request's client, preload, dehydrate ---
    const serverClient = new DbClient();
    configureFormListings(serverClient, {
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      queryFn: serverFetch,
    });

    await serverClient.preloadLiveQuery(orgFormsLiveQueryOptions());
    // SAFETY: dehydrated state holds plain rows/snapshots, so the wire copy is lossless.
    const state = JSON.parse(JSON.stringify(serverClient.dehydrate())) as DehydratedDbState;

    expect(serverFetch).toHaveBeenCalledTimes(1);

    // --- browser: same shape the app boots with ---
    // initCollections materializes the descriptor through the router's client before
    // <HydrationBoundary> hydrates, and the loader's ensure-query data landed in the
    // cache via the SSR query integration, so the collection syncs without fetching.
    const browserQc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    browserQc.setQueryData(queryKeys.formListings(), rows());

    const browserClient = bindBrowserDbClient(browserQc);
    configureFormListings(browserClient, {
      queryClient: browserQc,
      queryFn: browserFetch,
    });
    browserClient.collection(formListingsDescriptor);
    browserClient.hydrate(state);

    const html = renderToString(
      <DbProvider client={browserClient}>
        <HydrationBoundary state={state}>
          <OrgFormsCount />
        </HydrationBoundary>
      </DbProvider>,
    );

    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(html).toContain('data-count="2"');
    expect(browserFetch).not.toHaveBeenCalled();
    expect(serverFetch).toHaveBeenCalledTimes(1);
  });

  it("binds the router to the module client so collections and hydration share it", () => {
    const routerQueryClient = new QueryClient();

    // getRouter() asks for the module client: initCollections (via bindBrowserDbClient)
    // and hydrated route rows must land on the same DbClient the DbProvider scopes.
    const first = bindBrowserDbClient(routerQueryClient);
    expect(first).toBe(getBrowserDbClient());

    // A different query cache (tests, Hot reload) must swap the client so stale
    // query fns cannot leak between boots; the module client is the replacement.
    const rebound = bindBrowserDbClient(new QueryClient());
    expect(rebound).not.toBe(first);
    expect(getBrowserDbClient()).toBe(rebound);
    // Rebinding to yet another cache swaps again; the module client tracks the latest.
    const third = bindBrowserDbClient(new QueryClient());
    expect(third).toBe(getBrowserDbClient());
    expect(third).not.toBe(rebound);
  });
});
