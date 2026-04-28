import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getCookie, getRequestHeaders, getRequestUrl } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth/auth";
import { getActiveOrgId } from "@/lib/server-fn/auth-helpers";
import { getOrgPlan, requiresProForFormSettings } from "@/lib/server-fn/plan-helpers";
import type { FormProSettingsInput } from "@/lib/server-fn/plan-helpers";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) {
    const url = getRequestUrl();
    const pathname = new URL(url).pathname;
    throw redirect({
      to: "/login",
      search: { redirect: pathname },
    });
  }

  return await next({
    context: {
      session,
    },
  });
});

// Gates Pro-only fields on createForm / updateForm. Runs after authMiddleware
// so the session is already validated. Reads `data` (validated input) and
// throws before the handler runs when a free org tries to enable any
// Pro-gated setting.
export const formProSettingsMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next, data, context }) => {
    const input = data as unknown as FormProSettingsInput;
    if (!requiresProForFormSettings(input)) return next();

    const session = (context as unknown as { session?: unknown }).session as Parameters<
      typeof getActiveOrgId
    >[0];
    const plan = await getOrgPlan(getActiveOrgId(session));
    if (plan === "free") {
      throw new Error("This feature requires a Pro subscription. Please upgrade to continue.");
    }
    return next();
  },
);

export const guestMiddleware = createMiddleware().server(async ({ next }) => {
  // O(1) cookie check instead of DB round-trip (~1.97s saving)
  // authMiddleware on /dashboard will do full session validation + email verification
  const hasSession =
    getCookie("better-auth.session_token") || getCookie("__Secure-better-auth.session_token");

  if (hasSession) {
    throw redirect({ to: "/dashboard" });
  }

  return await next({
    context: {
      session: null,
    },
  });
});
