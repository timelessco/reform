import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { customDomains, forms, organization, workspaces } from "@/db/schema";

type DbExecutor = typeof db;

/**
 * Idempotent: running twice produces the same final state. The
 * `ne(status, 'suspended')` filter is what protects `previousStatus` from
 * being overwritten on a re-run.
 */
export const applyDowngradeCleanup = async (
  orgId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  await executor.transaction(async (tx) => {
    await tx.update(organization).set({ plan: "free" }).where(eq(organization.id, orgId));

    // `customization` is intentionally preserved — UI re-gates editing on free,
    // and clearing stored values would surprise a user who later re-upgrades.
    await tx
      .update(forms)
      .set({
        analytics: false,
        dataRetention: false,
        dataRetentionDays: null,
        respondentEmailNotifications: false,
        branding: true,
      })
      .where(
        inArray(
          forms.workspaceId,
          tx
            .select({ id: workspaces.id })
            .from(workspaces)
            .where(eq(workspaces.organizationId, orgId)),
        ),
      );

    await tx
      .update(customDomains)
      .set({
        previousStatus: sql`${customDomains.status}`,
        status: "suspended",
      })
      .where(and(eq(customDomains.organizationId, orgId), ne(customDomains.status, "suspended")));
  });
};

/**
 * Form columns are NOT auto-restored — re-flipping Pro features the user
 * implicitly opted out of during downgrade would be surprising.
 */
export const applyUpgradeRestore = async (
  orgId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  await executor.transaction(async (tx) => {
    await tx.update(organization).set({ plan: "pro" }).where(eq(organization.id, orgId));

    // Suspended rows without a recorded previousStatus (manual DB edit)
    // fall back to 'pending' so they re-verify before serving.
    await tx
      .update(customDomains)
      .set({
        status: sql`COALESCE(${customDomains.previousStatus}, 'pending')`,
        previousStatus: null,
      })
      .where(and(eq(customDomains.organizationId, orgId), eq(customDomains.status, "suspended")));
  });
};
