import { eq, sql } from "drizzle-orm";
import { forms, member, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { createAccessAuthorizer } from "./access";

/**
 * Get authenticated user with their active organization.
 * Throws if user is not authenticated or has no active org.
 */

const accessAuthorizer = createAccessAuthorizer({
  getWorkspaceById: async (workspaceId: string) => {
    const [workspace] = await db
      .select({
        id: workspaces.id,
        organizationId: workspaces.organizationId,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    return workspace ?? null;
  },
  getFormById: async (formId: string) => {
    const [form] = await db
      .select({
        id: forms.id,
        workspaceId: forms.workspaceId,
        organizationId: workspaces.organizationId,
      })
      .from(forms)
      .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
      .where(eq(forms.id, formId))
      .limit(1);

    return form ?? null;
  },
  getOrganizationMembershipIdsByUserId: async (userId: string) => {
    const memberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId));

    return memberships.map((membership) => membership.organizationId);
  },
});

/**
 * Authorize access to a workspace.
 * Checks if the user belongs to the organization that owns the workspace.
 */
export const authWorkspace = accessAuthorizer.authWorkspace;

/**
 * Authorize access to a form.
 * Checks if the user belongs to the organization that owns the form's workspace.
 */
export const authForm = accessAuthorizer.authForm;

type DbLike = { execute: typeof db.execute };

/**
 * Get PostgreSQL transaction ID. Must be called inside the same transaction as the mutation
 * for Electric sync to match correctly (see TanStack Electric docs).
 */
export const getTxId = async (tx?: DbLike): Promise<number> => {
  const client = tx ?? db;
  // Use ::xid::text (no ::int) - TanStack docs: "The ::xid cast strips off the epoch,
  // giving you the raw 32-bit value that matches what PostgreSQL sends in logical replication"
  const result = await client.execute<{ txid: string }>(
    sql`SELECT pg_current_xact_id()::xid::text as txid`,
  );
  const txid = result.rows[0]?.txid;
  if (txid === undefined) throw new Error("Failed to get transaction ID");
  return parseInt(txid, 10);
};
