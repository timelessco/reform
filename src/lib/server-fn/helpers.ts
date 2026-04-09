import { and, eq, exists } from "drizzle-orm";
import { forms, member, workspaces } from "@/db/schema";
import { db } from "@/db";

export const getActiveOrgId = (session: { session: Record<string, unknown> }): string => {
  const orgId = session.session.activeOrganizationId as string | undefined;
  if (!orgId) throw new Error("No active organization");
  return orgId;
};

/**
 * Get authenticated user with their active organization.
 * Throws if user is not authenticated or has no active org.
 */

/**
 * Authorize access to a workspace.
 * Checks if the workspace belongs to the user's active organization
 * and the user is a member of that organization.
 */
export const authWorkspace = async (
  workspaceId: string,
  userId: string,
  organizationId: string,
) => {
  const memberSubquery = db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)));

  const workspace = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.organizationId, organizationId),
        exists(memberSubquery),
      ),
    )
    .limit(1);

  if (workspace.length === 0) {
    throw new Error("Workspace not found or access denied");
  }
  return { workspace: workspace[0] };
};

/**
 * Authorize access to a form.
 * Checks if the form's workspace belongs to the user's active organization
 * and the user is a member of that organization.
 */
export const authForm = async (formId: string, userId: string, organizationId: string) => {
  const memberSubquery = db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)));

  const form = await db
    .select({ id: forms.id, workspaceId: forms.workspaceId })
    .from(forms)
    .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
    .where(
      and(
        eq(forms.id, formId),
        eq(workspaces.organizationId, organizationId),
        exists(memberSubquery),
      ),
    )
    .limit(1);

  if (form.length === 0) {
    throw new Error("Form not found or access denied");
  }
  return { form: form[0] };
};
