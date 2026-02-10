import { auth } from "@/lib/auth-client";

type PlanSlug = "free" | "pro" | "business";

const PLAN_LIMITS = {
  free: {
    members: 1,
    forms: 3,
    submissionsPerMonth: 100,
  },
  pro: {
    members: 5,
    forms: Infinity,
    submissionsPerMonth: 10000,
  },
  business: {
    members: Infinity,
    forms: Infinity,
    submissionsPerMonth: Infinity,
  },
};

async function getActivePlan(): Promise<PlanSlug> {
  const customerState = await auth.customer.state.queryOptions().queryFn();

  if (!customerState?.activeSubscriptions) return "free";
  return (customerState.activeSubscriptions[0].id as PlanSlug) || "free";
}

async function checkFeatureLimit(
  feature: keyof typeof PLAN_LIMITS.free,
  currentCount: number,
): Promise<boolean> {
  const plan = await getActivePlan();
  const limit = PLAN_LIMITS[plan][feature];
  return currentCount < limit;
}
