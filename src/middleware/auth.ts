import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw redirect({ to: "/" });
	}

	if (!session.user.emailVerified) {
		throw redirect({ to: "/verify-email" });
	}

	return await next({
		context: {
			session,
		},
	});
});

export const sessionMiddleware = createMiddleware().server(async ({ next }) => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });

	return await next({
		context: {
			session,
		},
	});
});
