import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import { forms, workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Get authenticated user with their active organization.
 * Throws if user is not authenticated or has no active org.
 */

/**
 * Authorize access to a workspace.
 * Checks if the workspace belongs to the user's active organization.
 */
export const authWorkspace = async (workspaceId: string, userId: string) => {

  const workspace = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.createdByUserId, userId)))
    .limit(1);

  if (workspace.length === 0) {
    throw new Error("Workspace not found or access denied");
  }
  return { workspace: workspace[0] };
};

/**
 * Authorize access to a form.
 * Checks if the form's workspace belongs to the user's active organization.
 */
export const authForm = async (formId: string, userId: string) => {

  const form = await db
    .select({ id: forms.id, workspaceId: forms.workspaceId })
    .from(forms)
    .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
    .where(and(eq(forms.id, formId), eq(forms.createdByUserId, userId)))
    .limit(1);

  if (form.length === 0) {
    throw new Error("Form not found or access denied");
  }
  return { form: form[0] };
};

export const getTxId = async () => {
  const result = await db.execute<{ txid: number }>(
    sql`SELECT pg_current_xact_id()::xid::text::int as txid`,
  );
  return result.rows[0].txid;
};
