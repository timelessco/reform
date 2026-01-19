import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

// Proxy-auth pattern based on ElectricSQL example
// Ref: https://github.com/electric-sql/electric/blob/main/examples/proxy-auth/app/shape-proxy/route.ts

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});

export const Route = createFileRoute("/api/electric")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				// Authenticate via BetterAuth cookies
				const session = await auth.api.getSession({ headers: request.headers });

				if (!session?.user?.id) {
					return json({ error: "Not authenticated" }, 401);
				}

				const userId = session.user.id;
				const url = new URL(request.url);

				// Required: which table to stream
				const table = url.searchParams.get("table")?.trim();
				const allowedTables = ["workspaces", "forms"];

				if (!table || !allowedTables.includes(table)) {
					return json({ error: "Invalid or missing table." }, 400);
				}

				// Build WHERE SQL to filter by user access
				let whereSql: string;

				switch (table) {
					case "forms":
						// Get all workspaces owned by this user
						const userWorkspaces = await db
							.select({ id: workspaces.id })
							.from(workspaces)
							.where(eq(workspaces.userId, userId));

						// If user has no workspaces, return empty result set
						if (userWorkspaces.length === 0) {
							whereSql = `1 = 0`;
						} else {
							// Build IN clause with all workspace IDs
							const workspaceIds = userWorkspaces
								.map((ws) => `'${ws.id}'`)
								.join(", ");
							whereSql = `"workspace_id" IN (${workspaceIds})`;
						}
						break;

					case "workspaces":
						// Filter workspaces by userId
						whereSql = `"user_id" = '${userId}'`;
						break;

					default:
						throw new Error("Invalid table");
				}

				// Proxy to Electric server
				const electricUrl = process.env.ELECTRIC_URL || "http://localhost:4000";
				const upstreamUrl = new URL("/v1/shape", electricUrl);

				// Forward all query params from the client, except 'table' (we'll set it)
				for (const [key, value] of url.searchParams.entries()) {
					if (key === "table") continue;
					upstreamUrl.searchParams.set(key, value);
				}

				// Set the table and WHERE clause
				upstreamUrl.searchParams.set("table", table);
				upstreamUrl.searchParams.set("where", whereSql);

				console.log("electric-proxy", {
					userId,
					table,
					where: whereSql,
					url: upstreamUrl.toString(),
				});

				try {
					const upstream = await fetch(upstreamUrl.toString(), {
						method: "GET",
					});

					// Copy headers from upstream, with modifications
					const headers = new Headers(upstream.headers);

					// Remove any upstream CORS headers to avoid conflicts
					headers.delete("access-control-allow-origin");
					headers.delete("access-control-allow-credentials");

					// Ensure caches vary by Cookie since auth is cookie-based
					headers.set("Vary", "Cookie");

					// Return the streaming response
					return new Response(upstream.body, {
						status: upstream.status,
						headers,
					});
				} catch (error) {
					console.error("Electric proxy error:", error);
					return json({ error: "Failed to connect to Electric server" }, 502);
				}
			},
		},
	},
});
