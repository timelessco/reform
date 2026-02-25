import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getCookie, getRequestHeaders } from "@tanstack/react-start/server";
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

export const guestMiddleware = createMiddleware().server(async ({ next }) => {
  // O(1) cookie check instead of DB round-trip (~1.97s saving)
  // authMiddleware on /dashboard will do full session validation + email verification
  const hasSession =
    getCookie("better-auth.session_token") ||
    getCookie("__Secure-better-auth.session_token");

  if (hasSession) {
    throw redirect({ to: "/dashboard" });
  }

  return await next({
    context: {
      session: null,
    },
  });
});
