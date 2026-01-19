import { getRequestHeaders } from "@tanstack/react-start/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces, forms } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const authUser = async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	const user = session?.user;
	if (!user) {
		throw new Error("Unauthorized");
	}
	return user;
};

export const authWorkspace = async (workspaceId: string) => {
	const user = await authUser();
	const workspace = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)))
		.limit(1);

	if (workspace.length === 0) {
		throw new Error("Workspace not found or access denied");
	}
	return { user, workspace: workspace[0] };
};

export const authForm = async (formId: string) => {
	const user = await authUser();
	const form = await db
		.select({ id: forms.id })
		.from(forms)
		.where(and(eq(forms.id, formId), eq(forms.userId, user.id)))
		.limit(1);

	if (form.length === 0) {
		throw new Error("Form not found or access denied");
	}
	return { user, form: form[0] };
};

export const getTxId = async () => {
	const result = await db.execute<{ txid: number }>(
		sql`SELECT pg_current_xact_id()::xid::text::int as txid`,
	);
	return result.rows[0].txid;
};
