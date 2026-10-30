import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/query-core";
import { collectionOptions, createCollection, DbClient } from "@tanstack/db";
import type { DehydratedDbState, InitialQueryBuilder } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { DbProvider, HydrationBoundary, useLiveQuery } from "@tanstack/react-db";
import type { FormListing } from "@/collections/query/form-listing";
import { queryKeys } from "@/lib/query-keys";

/**
 * DB 1.0 SSR contract, exercised through the same adapter this app uses
 * (`queryCollectionOptions`): a request-scoped `DbClient` preloads the live query a
 * route renders and dehydrates its ordered result; the browser client hydrates that
 * result so its first render shows rows instead of an empty list.
 *
 * The third case pins down what SSR does *not* allow: rows that exist only on the
 * server cannot reach the browser through a collection the client never materialized,
 * so the render fails loudly instead of shipping markup that would hydrate differently.
 */

const listing = (id: string, title: string): FormListing => ({
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

/** Counts adapter syncs so the test can prove the browser render did not refetch. */
const syncCount = { value: 0 };

const rows = () => [listing("a", "Alpha"), listing("b", "Beta")];

/** Per-client config: each `DbClient` materializes its own collection from this. */
const formListingsDescriptor = collectionOptions("form-listings", () =>
  queryCollectionOptions<FormListing, unknown, string[]>({
    id: "form-listings",
    queryKey: queryKeys.formListings(),
    queryFn: async () => {
      syncCount.value += 1;

      return rows();
    },
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    getKey: (item): string => item.id,
    staleTime: 60_000,
  }),
);

/** One config object shared by the loader's preload and the component's hook. */
const openForms = {
  query: (q: InitialQueryBuilder) =>
    q
      .from({ form: formListingsDescriptor })
      .select(({ form }) => ({ id: form.id, title: form.title }))
      .orderBy(({ form }) => form.title, "asc"),
};

const FormList = () => {
  const { data, status } = useLiveQuery(openForms);

  return (
    <ul data-status={status}>
      {(data ?? []).map((row) => (
        <li key={row.id}>{row.title}</li>
      ))}
    </ul>
  );
};

describe("TanStack DB SSR hydration", () => {
  it("renders preloaded rows on the server and hands them to the browser", async () => {
    syncCount.value = 0;

    // --- server render -----------------------------------------------------
    const server = new DbClient();
    await server.preloadLiveQuery(openForms);
    const state = server.dehydrate();

    // What a route loader returns has to survive the wire.
    const transported = JSON.parse(JSON.stringify(state)) as DehydratedDbState;

    const serverHtml = renderToString(
      <DbProvider client={server}>
        <HydrationBoundary state={transported}>
          <FormList />
        </HydrationBoundary>
      </DbProvider>,
    );

    expect(serverHtml).toContain("Alpha");
    expect(serverHtml).toContain("Beta");
    expect(serverHtml).toContain('data-status="ready"');
    expect(syncCount.value).toBeGreaterThan(0);

    // --- browser render ----------------------------------------------------
    const browser = new DbClient();
    browser.hydrate(transported);
    const syncsBeforeBrowserRender = syncCount.value;

    const browserHtml = renderToString(
      <DbProvider client={browser}>
        <HydrationBoundary state={transported}>
          <FormList />
        </HydrationBoundary>
      </DbProvider>,
    );

    // The transported snapshot renders on the first client pass, before the browser's
    // own collection sync has produced anything.
    expect(browserHtml).toContain("Alpha");
    expect(browserHtml).toContain("Beta");
    expect(syncCount.value).toBe(syncsBeforeBrowserRender);
  });

  it("renders a stable pending state instead of inventing rows when nothing was preloaded", () => {
    const server = new DbClient();

    const html = renderToString(
      <DbProvider client={server}>
        <FormList />
      </DbProvider>,
    );

    // No rows on the server means no rows in the markup: the browser starts from the
    // same empty state, so hydration matches and the query resolves client-side.
    expect(html).not.toContain("Alpha");
    expect(html).toContain('data-status="loading"');
  });

  it("refuses to render rows from a collection the browser cannot hydrate", async () => {
    // A module-scope collection, the pre-1.0 pattern: the request-scoped client has
    // no materialized copy to capture, so these rows would never reach the browser.
    const concrete = createCollection(
      queryCollectionOptions<FormListing, unknown, string[]>({
        id: "form-listings-concrete",
        queryKey: [...queryKeys.formListings(), "concrete"],
        queryFn: async () => rows(),
        queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
        getKey: (item): string => item.id,
        staleTime: 60_000,
      }),
    );

    await concrete.preload();
    expect(concrete.size).toBe(2);

    const server = new DbClient();

    const concreteQuery = {
      query: (q: InitialQueryBuilder) =>
        q.from({ form: concrete }).select(({ form }) => ({ id: form.id, title: form.title })),
    };

    const List = () => {
      const { data } = useLiveQuery(concreteQuery);

      return (
        <ul>
          {(data ?? []).map((row) => (
            <li key={row.id}>{row.title}</li>
          ))}
        </ul>
      );
    };

    expect(() =>
      renderToString(
        <DbProvider client={server}>
          <List />
        </DbProvider>,
      ),
    ).toThrow(/SSR cannot render server-only live-query rows/);
  });
});
