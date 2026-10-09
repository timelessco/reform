import { describe, expect, it } from "vitest";

/**
 * Pins the prefetch contract for every route that warms the query cache.
 *
 * The loader must prime the keys from the options published by route context rather than
 * building its own. Component subscriptions are reviewed separately. A
 * drifted key is silent at runtime: the loader warms one cache entry, the component fetches
 * another, and the only symptom is a waterfall plus a Suspense flash.
 *
 * Identity of the `queryKey` array proves that the loader reused the context's key. A spread
 * such as `{ ...context.opts, revalidateIfStale: true }` carries the same array through, while
 * reconstructing options in the loader would allocate a fresh one.
 */

type Recorded = { kind: "query" | "infinite"; queryKey: unknown };

const recordingQueryClient = (result: unknown) => {
  const ensured: Recorded[] = [];

  const record = (kind: Recorded["kind"]) => (opts: { queryKey: unknown }) => {
    ensured.push({ kind, queryKey: opts.queryKey });

    return Promise.resolve(result);
  };

  return {
    ensured,
    queryClient: {
      ensureQueryData: record("query"),
      ensureInfiniteQueryData: record("infinite"),
    },
  };
};

type RouteArgs = { context: unknown; params: unknown; deps: unknown };

type TestableRoute = {
  options: {
    context?: (a: RouteArgs) => Record<string, { queryKey: unknown }>;
    loader: (a: RouteArgs) => Promise<unknown>;
  };
};

/** Drives one route the way the router does: build route context, then run the loader with it. */
const prefetch = async (route: unknown, params: unknown, result: unknown) => {
  const { options } = route as TestableRoute;
  const { ensured, queryClient } = recordingQueryClient(result);
  const deps = {};
  const routeContext = options.context?.({ params, deps, context: { queryClient } }) ?? {};

  const loaderData = await options.loader({
    context: { ...routeContext, queryClient },
    params,
    deps,
  });

  return {
    loaderData,
    ensured,
    keys: ensured.map((e) => e.queryKey),
    /** The queryKey arrays the route context published, in declaration order. */
    publishedKeys: Object.values(routeContext).map((o) => o.queryKey),
  };
};

const FORM_ID = "11111111-1111-4111-8111-111111111111";

const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";

describe("/_authenticated loader", () => {
  it("primes the org-layout query plus the three collection caches", async () => {
    const { Route } = await import("@/routes/_authenticated");

    const { keys, publishedKeys, loaderData } = await prefetch(
      Route,
      {},
      { activeOrg: { id: "org-1" }, orgsData: [] },
    );

    expect(keys).toStrictEqual([
      ["org-data-for-layout"],
      ["workspaces-with-forms"],
      ["form-listings"],
      ["favorites"],
    ]);
    keys.forEach((key, i) => expect(key).toBe(publishedKeys[i]));
    expect(loaderData).toStrictEqual({ activeOrg: { id: "org-1" }, orgsData: [] });
  });
});

describe("/_authenticated/workspace/$workspaceId/form-builder/$formId loader", () => {
  it("primes the form detail and version-list queries", async () => {
    const { Route } =
      await import("@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/route");

    const { keys, publishedKeys } = await prefetch(
      Route,
      { formId: FORM_ID, workspaceId: WORKSPACE_ID },
      { form: { id: FORM_ID } },
    );

    expect(keys).toStrictEqual([
      ["forms", FORM_ID],
      ["form-versions", FORM_ID],
    ]);
    keys.forEach((key, i) => expect(key).toBe(publishedKeys[i]));
  });
});

describe("/_authenticated/.../$formId/submissions loader", () => {
  it("primes the bootstrap query and the infinite submissions list", async () => {
    const { Route } =
      await import("@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/submissions");

    const { ensured, keys, publishedKeys } = await prefetch(
      Route,
      { formId: FORM_ID, workspaceId: WORKSPACE_ID },
      { pages: [], pageParams: [] },
    );

    expect(ensured).toStrictEqual([
      { kind: "query", queryKey: ["submissionsBootstrap", FORM_ID] },
      { kind: "infinite", queryKey: ["submissions", FORM_ID] },
    ]);
    keys.forEach((key, i) => expect(key).toBe(publishedKeys[i]));
  });
});
