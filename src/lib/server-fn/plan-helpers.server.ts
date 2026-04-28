import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { isServerPlan } from "./plan-helpers";
import type { ServerPlan } from "./plan-helpers";

// Reads the cached `organization.plan` (synced by Polar webhooks); falls back
// to 'free' for unknown orgs or unexpected column values.
export const getOrgPlan = async (orgId: string): Promise<ServerPlan> => {
  const [row] = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, orgId));
  return isServerPlan(row?.plan) ? row.plan : "free";
};
