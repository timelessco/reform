import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";

export type ServerPlan = "free" | "pro" | "biz";

const isServerPlan = (value: unknown): value is ServerPlan =>
  value === "free" || value === "pro" || value === "biz";

// Reads the cached `organization.plan` (synced by Polar webhooks); falls back
// to 'free' for unknown orgs or unexpected column values.
export const getOrgPlan = async (orgId: string): Promise<ServerPlan> => {
  const [row] = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, orgId));
  return isServerPlan(row?.plan) ? row.plan : "free";
};

export type FormProSettingsInput = {
  branding?: boolean;
  respondentEmailNotifications?: boolean;
  dataRetention?: boolean;
  analytics?: boolean;
  customization?: Record<string, unknown> | null;
};

// Pure predicate: do these form-settings inputs require a Pro plan?
// Used by formProSettingsMiddleware to decide whether to fetch the plan.
export const requiresProForFormSettings = (data: FormProSettingsInput): boolean => {
  if (data.branding === false) return true;
  if (data.respondentEmailNotifications === true) return true;
  if (data.dataRetention === true) return true;
  if (data.analytics === true) return true;
  if (data.customization != null && Object.keys(data.customization).length > 0) return true;
  return false;
};
