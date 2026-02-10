import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import { forms, workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const authUser = async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  const user = session?.user;
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};

/**
 * Get authenticated user with their active organization.
 * Throws if user is not authenticated or has no active org.
 */
const authUserWithOrg = async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  const user = session?.user;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const activeOrgId = session?.session?.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error("No active organization");
  }

  return { user, activeOrgId };
};

/**
 * Authorize access to a workspace.
 * Checks if the workspace belongs to the user's active organization.
 */
export const authWorkspace = async (workspaceId: string) => {
  const { user, activeOrgId } = await authUserWithOrg();

  const workspace = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.organizationId, activeOrgId)))
    .limit(1);

  if (workspace.length === 0) {
    throw new Error("Workspace not found or access denied");
  }
  return { user, workspace: workspace[0], activeOrgId };
};

/**
 * Authorize access to a form.
 * Checks if the form's workspace belongs to the user's active organization.
 */
export const authForm = async (formId: string) => {
  const { user, activeOrgId } = await authUserWithOrg();

  const form = await db
    .select({ id: forms.id, workspaceId: forms.workspaceId })
    .from(forms)
    .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
    .where(and(eq(forms.id, formId), eq(workspaces.organizationId, activeOrgId)))
    .limit(1);

  if (form.length === 0) {
    throw new Error("Form not found or access denied");
  }
  return { user, form: form[0], activeOrgId };
};

export const getTxId = async () => {
  const result = await db.execute<{ txid: number }>(
    sql`SELECT pg_current_xact_id()::xid::text::int as txid`,
  );
  return result.rows[0].txid;
};
