import { member, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { createFileRoute } from "@tanstack/react-router";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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
        // Use session from authMiddleware instead of re-fetching
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

        let whereSql: string;
        let whereParams: Record<string, string> = {};

        // Hoist membership query before switch - shared by forms, workspaces, submissions, form_versions
        const needsMembership = ["forms", "workspaces", "submissions", "form_versions"].includes(
          table,
        );
        const userMemberships = needsMembership
          ? await db
              .select({ organizationId: member.organizationId })
              .from(member)
              .where(eq(member.userId, userId))
          : [];

        // Hoist workspace query - shared by forms, submissions, form_versions
        const needsWorkspaces = ["forms", "submissions", "form_versions"].includes(table);
        const workspaceList =
          needsWorkspaces && userMemberships.length > 0
            ? await db
                .select({ id: workspaces.id })
                .from(workspaces)
                .where(
                  inArray(
                    workspaces.organizationId,
                    userMemberships.map((m) => m.organizationId),
                  ),
                )
            : [];

        switch (table) {
          case "forms": {
            if (userMemberships.length === 0) {
              whereSql = `1 = 0`;
            } else if (workspaceList.length === 0) {
              whereSql = `1 = 0`;
            } else {
              const placeholders = workspaceList.map((_, i) => `$${i + 1}`).join(", ");
              whereSql = `"workspaceId" IN (${placeholders})`;
              for (let i = 0; i < workspaceList.length; i++) {
                whereParams[`params[${i + 1}]`] = workspaceList[i].id;
              }
            }
            break;
          }

          case "workspaces": {
            if (userMemberships.length === 0) {
              whereSql = `1 = 0`;
            } else {
              const placeholders = userMemberships.map((_, i) => `$${i + 1}`).join(", ");
              whereSql = `"organizationId" IN (${placeholders})`;
              for (let i = 0; i < userMemberships.length; i++) {
                whereParams[`params[${i + 1}]`] = userMemberships[i].organizationId;
              }
            }
            break;
          }

          case "submissions": {
            if (userMemberships.length === 0 || workspaceList.length === 0) {
              whereSql = `1 = 0`;
            } else {
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
                const placeholders = formList.map((_, i) => `$${i + 1}`).join(", ");
                whereSql = `"formId" IN (${placeholders})`;
                for (let i = 0; i < formList.length; i++) {
                  whereParams[`params[${i + 1}]`] = formList[i].id;
                }
              }
            }
            break;
          }

          case "form_versions": {
            if (userMemberships.length === 0 || workspaceList.length === 0) {
              whereSql = `1 = 0`;
            } else {
              const { forms } = await import("@/db/schema");
              const formListVersions = await db
                .select({ id: forms.id })
                .from(forms)
                .where(
                  inArray(
                    forms.workspaceId,
                    workspaceList.map((ws) => ws.id),
                  ),
                );

              if (formListVersions.length === 0) {
                whereSql = `1 = 0`;
              } else {
                const placeholders = formListVersions.map((_, i) => `$${i + 1}`).join(", ");
                whereSql = `"formId" IN (${placeholders})`;
                for (let i = 0; i < formListVersions.length; i++) {
                  whereParams[`params[${i + 1}]`] = formListVersions[i].id;
                }
              }
            }
            break;
          }

          case "form_favorites": {
            // Users can only see their own favorites
            whereSql = `"userId" = $1`;
            whereParams[`params[1]`] = userId;
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

          const responseHeaders = new Headers();

          // Copy all upstream headers including electric-* headers
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

          // Override cache control
          responseHeaders.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          );
          responseHeaders.set("Pragma", "no-cache");
          responseHeaders.set("Expires", "0");
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
