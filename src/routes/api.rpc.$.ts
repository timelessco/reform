import "@/polyfill";

import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import router from "@/orpc/router";

const handler = new RPCHandler(router);

async function handleRequest({ request }: { request: Request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user?.id;

	const { response } = await handler.handle(request, {
		prefix: "/api/rpc",
		context: { userId },
	});

	return response ?? new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			ANY: handleRequest
		},
	},
});
