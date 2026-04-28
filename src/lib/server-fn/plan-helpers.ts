export type ServerPlan = "free" | "pro" | "biz";

const isServerPlan = (value: unknown): value is ServerPlan =>
  value === "free" || value === "pro" || value === "biz";

// Reads the cached `organization.plan` (synced by Polar webhooks); falls back
// to 'free' for unknown orgs or unexpected column values.
//
// Uses dynamic imports so the `@/db` (and pg) module graph never lands in
// chunks that statically import this file from a client-reachable path
// (e.g. forms.ts is imported by route loaders — its top-level imports are
// not stripped by Vite dev).
export const getOrgPlan = async (orgId: string): Promise<ServerPlan> => {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { organization } = await import("@/db/schema");
  const [row] = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, orgId));
  return isServerPlan(row?.plan) ? row.plan : "free";
};

type FormPlanInput = {
  branding?: boolean;
  respondentEmailNotifications?: boolean;
  dataRetention?: boolean;
  analytics?: boolean;
  customization?: Record<string, unknown> | null;
};

export const assertPlanForFormSettings = async (
  orgId: string,
  data: FormPlanInput,
): Promise<void> => {
  const wantsBrandingRemoved = data.branding === false;
  const wantsRespondentEmails = data.respondentEmailNotifications === true;
  const wantsDataRetention = data.dataRetention === true;
  const wantsAnalytics = data.analytics === true;
  const wantsCustomization =
    data.customization != null && Object.keys(data.customization).length > 0;

  if (
    !(
      wantsBrandingRemoved ||
      wantsRespondentEmails ||
      wantsDataRetention ||
      wantsAnalytics ||
      wantsCustomization
    )
  )
    return;

  const plan = await getOrgPlan(orgId);
  if (plan === "free") {
    throw new Error("This feature requires a Pro subscription. Please upgrade to continue.");
  }
};
