import { member, workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createFileRoute  } from "@tanstack/react-router";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/electric")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user?.id) {
          return json({ error: "Not authenticated" }, 401);
        }

        const userId = session.user.id;
        const url = new URL(request.url);

        const table = url.searchParams.get("table")?.trim();
        const allowedTables = ["workspaces", "forms", "submissions", "form_favorites"];

        if (!table || !allowedTables.includes(table)) {
          return json({ error: "Invalid or missing table." }, 400);
        }

        let whereSql: string;

        switch (table) {
          case "forms": {
            // Get all workspaces owned by the user's organizations
            const userMemberships = await db
              .select({ organizationId: member.organizationId })
              .from(member)
              .where(eq(member.userId, userId));

            if (userMemberships.length === 0) {
              whereSql = `1 = 0`;
            } else {
              const workspaceList = await db
                .select({ id: workspaces.id })
                .from(workspaces)
                .where(
                  inArray(
                    workspaces.organizationId,
                    userMemberships.map((m) => m.organizationId),
                  ),
                );

              if (workspaceList.length === 0) {
                whereSql = `1 = 0`;
              } else {
                const workspaceIds = workspaceList.map((ws) => `'${ws.id}'`).join(", ");
                whereSql = `"workspaceId" IN (${workspaceIds})`;
              }
            }
            break;
          }

          case "workspaces": {
            // Get organizations the user is a member of
            const userMemberships = await db
              .select({ organizationId: member.organizationId })
              .from(member)
              .where(eq(member.userId, userId));

            if (userMemberships.length === 0) {
              whereSql = `1 = 0`;
            } else {
              const orgIds = userMemberships.map((m) => `'${m.organizationId}'`);
              whereSql = `"organizationId" IN (${orgIds})`;
            }
            break;
          }

          case "submissions": {
            // Get all forms the user has access to via their organizations
            const userMemberships = await db
              .select({ organizationId: member.organizationId })
              .from(member)
              .where(eq(member.userId, userId));

            if (userMemberships.length === 0) {
              whereSql = `1 = 0`;
            } else {
              const workspaceList = await db
                .select({ id: workspaces.id })
                .from(workspaces)
                .where(
                  inArray(
                    workspaces.organizationId,
                    userMemberships.map((m) => m.organizationId),
                  ),
                );

              if (workspaceList.length === 0) {
                whereSql = `1 = 0`;
              } else {
                // Import forms table
                const { forms } = await import("@/db/schema");
                const formList = await db
                  .select({ id: forms.id })
                  .from(forms)
                  .where(
                    inArray(
                      forms.workspaceId,
                      workspaceList.map((ws) => ws.id),
                    ),
                  );

                if (formList.length === 0) {
                  whereSql = `1 = 0`;
                } else {
                  const formIds = formList.map((f) => `'${f.id}'`).join(", ");
                  whereSql = `"formId" IN (${formIds})`;
                }
              }
            }
            break;
          }

          case "form_favorites": {
            // Users can only see their own favorites
            whereSql = `"userId" = '${userId}'`;
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
        }

        // Forward all query parameters (including cache busters)
        for (const [key, value] of url.searchParams.entries()) {
          upstreamUrl.searchParams.set(key, value);
        }

        upstreamUrl.searchParams.set("table", table);
        upstreamUrl.searchParams.set("where", whereSql);

        // logger("electric-proxy", {
        //   userId,
        //   table,
        //   where: whereSql,
        //   sourceId: sourceId ? `${sourceId.substring(0, 8)}...` : "not set",
        //   url: upstreamUrl.toString().replace(sourceSecret || "", "[REDACTED]"),
        // });

        try {
          const upstream = await fetch(upstreamUrl.toString(), {
            method: "GET",
            cache: "no-store",
          });

          // Log upstream response for debugging
          console.log("[Electric Proxy] Upstream status:", upstream.status);
          console.log("[Electric Proxy] Upstream headers:", Object.fromEntries(upstream.headers.entries()));

          // Clone headers to avoid modification issues
          const responseHeaders = new Headers();

          // Copy all headers from upstream including electric-*
          for (const [key, value] of upstream.headers.entries()) {
            // Skip problematic headers
            if (
              key === "content-encoding" ||
              key === "content-length" ||
              key === "transfer-encoding"
            ) {
              continue;
            }
            responseHeaders.set(key, value);
          }

          // Override cache control
          responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          responseHeaders.set("Pragma", "no-cache");
          responseHeaders.set("Expires", "0");
          responseHeaders.set("Vary", "Cookie");

          // Test header to verify headers are being set
          responseHeaders.set("X-Electric-Proxy", "true");

          console.log("[Electric Proxy] Final headers:", Object.fromEntries(responseHeaders.entries()));

          // Create new Response - TanStack Start should preserve these headers
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
