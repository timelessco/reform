/**
 * The browser app's TanStack DB client.
 *
 * DB 1.0 scopes collections to a `DbClient`: the router owns one per request on the
 * server and one per tab in the browser, and a dehydrated live-query result only
 * applies to the client that `hydrate()`d it. Collections therefore materialize from
 * this client rather than from `createCollection`, so a route loader's preload and the
 * component's `useLiveQuery` can meet in the same place.
 */
import { DbClient } from "@tanstack/db";
import type { QueryClient } from "@tanstack/query-core";

let browserClient: DbClient | null = null;

let browserQueryClient: QueryClient | null = null;

/** The current tab's client. Created on first use and kept for the app's lifetime. */
export const getBrowserDbClient = (): DbClient => {
  browserClient ??= new DbClient();

  return browserClient;
};

/**
 * Bind the browser client to the app's query cache.
 *
 * `initCollections` runs once per app boot, but tests run it once per case with a
 * fresh `QueryClient`. A new cache means a new client, otherwise materialized
 * collections would keep reading the previous test's cache.
 */
export const bindBrowserDbClient = (queryClient: QueryClient): DbClient => {
  if (browserQueryClient && browserQueryClient !== queryClient) browserClient = new DbClient();

  browserQueryClient = queryClient;

  return getBrowserDbClient();
};
