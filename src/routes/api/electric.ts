import { forms, member, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware } from "@/middleware/auth";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ---------------------------------------------------------------------------
// In-memory cache for user permission data (TTL: 30 seconds)
// Eliminates 1-3 DB queries on every Electric request including long-polls.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_SIZE = 500;

interface CachedUserData {
  memberships: { organizationId: string }[];
  workspaceIds: string[];
  formIds: string[];
  timestamp: number;
}

const userCache = new Map<string, CachedUserData>();
const inflightRequests = new Map<string, Promise<CachedUserData>>();

const getCachedUserData = async (userId: string): Promise<CachedUserData> => {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  // Deduplicate concurrent requests for the same user
  const inflight = inflightRequests.get(userId);
  if (inflight) return inflight;

  const promise = fetchUserData(userId);
  inflightRequests.set(userId, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(userId);
  }
};

const fetchUserData = async (userId: string): Promise<CachedUserData> => {
  const rows = await db
    .select({
      orgId: member.organizationId,
      workspaceId: workspaces.id,
      formId: forms.id,
    })
    .from(member)
    .leftJoin(workspaces, eq(workspaces.organizationId, member.organizationId))
    .leftJoin(forms, eq(forms.workspaceId, workspaces.id))
    .where(eq(member.userId, userId));

  const orgIdSet = new Set<string>();
  const workspaceIdSet = new Set<string>();
  const formIdSet = new Set<string>();

  for (const row of rows) {
    orgIdSet.add(row.orgId);
    if (row.workspaceId) workspaceIdSet.add(row.workspaceId);
    if (row.formId) formIdSet.add(row.formId);
  }

  const memberships = [...orgIdSet].map((organizationId) => ({ organizationId }));
  const workspaceIds = [...workspaceIdSet];
  const formIds = [...formIdSet];

  const data: CachedUserData = {
    memberships,
    workspaceIds,
    formIds,
    timestamp: Date.now(),
  };

  // Evict oldest entries if cache exceeds max size
  if (userCache.size >= CACHE_MAX_SIZE) {
    const firstKey = userCache.keys().next().value;
    if (firstKey) userCache.delete(firstKey);
  }

  userCache.set(userId, data);
  return data;
};

const buildInClause = (
  column: string,
  values: string[],
): { whereSql: string; whereParams: Record<string, string> } => {
  if (values.length === 0) return { whereSql: "1 = 0", whereParams: {} };
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const params: Record<string, string> = {};
  for (let i = 0; i < values.length; i++) {
    params[`params[${i + 1}]`] = values[i];
  }
  return { whereSql: `"${column}" IN (${placeholders})`, whereParams: params };
};

export const Route = createFileRoute("/api/electric")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({
        request,
        context,
      }: {
        request: Request;
        context: { session: { user: { id: string } } };
      }) => {
        if (!context?.session?.user?.id) {
          return json({ error: "Not authenticated" }, 401);
        }

        const userId = context.session.user.id;
        const url = new URL(request.url);

        const table = url.searchParams.get("table")?.trim();
        const allowedTables = [
          "workspaces",
          "forms",
          "submissions",
          "form_favorites",
          "form_versions",
        ];

        if (!table || !allowedTables.includes(table)) {
          return json({ error: "Invalid or missing table." }, 400);
        }

        // Use cached user data instead of querying DB on every request
        const userData = await getCachedUserData(userId);

        let whereSql: string;
        let whereParams: Record<string, string> = {};

        switch (table) {
          case "forms": {
            ({ whereSql, whereParams } = buildInClause("workspaceId", userData.workspaceIds));
            break;
          }

          case "workspaces": {
            ({ whereSql, whereParams } = buildInClause(
              "organizationId",
              userData.memberships.map((m) => m.organizationId),
            ));
            break;
          }

          case "submissions":
          case "form_versions": {
            ({ whereSql, whereParams } = buildInClause("formId", userData.formIds));
            break;
          }

          case "form_favorites": {
            whereSql = `"userId" = $1`;
            whereParams["params[1]"] = userId;
            break;
          }

          default:
            throw new Error("Invalid table");
        }

        const electricUrl = process.env.ELECTRIC_URL || "https://api.electric-sql.cloud";
        const upstreamUrl = new URL("/v1/shape", electricUrl);

        const sourceId = process.env.ELECTRIC_SQL_CLOUD_SOURCE_ID;
        const sourceSecret = process.env.ELECTRIC_SQL_CLOUD_SOURCE_SECRET;

        if (sourceId && sourceSecret) {
          upstreamUrl.searchParams.set("source_id", sourceId);
          upstreamUrl.searchParams.set("source_secret", sourceSecret);
        } else if (process.env.NODE_ENV === "production") {
          return json({ error: "Electric source credentials not configured" }, 500);
        }

        // Forward only Electric protocol query parameters
        for (const [key, value] of url.searchParams.entries()) {
          if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
            upstreamUrl.searchParams.set(key, value);
          }
        }

        upstreamUrl.searchParams.set("table", table);
        upstreamUrl.searchParams.set("where", whereSql);
        for (const [key, value] of Object.entries(whereParams)) {
          upstreamUrl.searchParams.set(key, value);
        }

        // Forward columns param if specified (not in ELECTRIC_PROTOCOL_QUERY_PARAMS)
        const columns = url.searchParams.get("columns");
        if (columns) {
          upstreamUrl.searchParams.set("columns", columns);
        }

        try {
          const upstream = await fetch(upstreamUrl.toString(), {
            method: "GET",
            cache: "no-store",
          });

          const responseHeaders = new Headers();

          for (const [key, value] of upstream.headers.entries()) {
            if (
              key === "content-encoding" ||
              key === "content-length" ||
              key === "transfer-encoding"
            ) {
              continue;
            }
            responseHeaders.set(key, value);
          }

          responseHeaders.set(
            "Access-Control-Expose-Headers",
            "electric-offset, electric-handle, electric-schema, electric-cursor",
          );

          responseHeaders.set("Vary", "Cookie");

          return new Response(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
          });
        } catch (error) {
          console.error("Electric proxy error:", error);
          return json({ error: "Failed to connect to Electric server" }, 502);
        }
      },
    },
  },
});
