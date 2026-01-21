import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { forms, member, organization, workspaces } from "@/db/schema";
import { authUser, getTxId } from "@/lib/fn/helpers";
import { logger } from "@/lib/utils";

/**
 * Server function to sync forms to the cloud
 */
export const syncFormsToCloud = createServerFn({ method: "POST" })
	.inputValidator((forms: any[]) => forms)
	.handler(async ({ data: localForms }) => {
		try {
			logger("Starting server-side form sync...");

			if (!localForms || localForms.length === 0) {
				logger("No forms to sync");
				return { success: true };
			}

			// Ensure user is authenticated
			const user = await authUser();

			// Track all txids for Electric sync
			const txids: number[] = [];

			// Get user's organization memberships
			const userMemberships = await db
				.select({ organizationId: member.organizationId })
				.from(member)
				.where(eq(member.userId, user.id));

			if (userMemberships.length === 0) {
				logger("User has no organization memberships, creating default org...");
				// Create a default organization for the user
				const now = new Date();
				const newOrgId = crypto.randomUUID();
				await db.insert(organization).values({
					id: newOrgId,
					name: `${user.name || user.email}'s Organization`,
					slug: `org-${newOrgId.slice(0, 8)}`,
					createdAt: now,
				});
				txids.push(await getTxId()); // Capture org txid

				// Add user as owner of the new organization
				await db.insert(member).values({
					id: crypto.randomUUID(),
					userId: user.id,
					organizationId: newOrgId,
					role: "owner",
					createdAt: now,
				});
				txids.push(await getTxId()); // Capture member txid

				userMemberships.push({ organizationId: newOrgId });
				logger("Created default organization:", newOrgId);
			}

			const userOrgIds = userMemberships.map((m) => m.organizationId);

			// Get existing server workspaces for user's organizations
			const serverWorkspaces = await db
				.select({
					id: workspaces.id,
					name: workspaces.name,
					organizationId: workspaces.organizationId,
				})
				.from(workspaces)
				.where(inArray(workspaces.organizationId, userOrgIds))
				.orderBy(workspaces.createdAt);

			// Create default workspace if no workspaces exist on server
			let defaultWorkspaceId: string;
			let workspaceTxid: number | undefined;
			const defaultOrgId = userOrgIds[0];
			if (serverWorkspaces.length === 0) {
				logger("Creating default workspace on server...");
				const now = new Date();
				const [newWorkspace] = await db
					.insert(workspaces)
					.values({
						id: crypto.randomUUID(),
						organizationId: defaultOrgId,
						createdByUserId: user.id,
						name: "My workspace",
						createdAt: now,
						updatedAt: now,
					})
					.returning();
				workspaceTxid = await getTxId(); // Capture workspace txid separately
				txids.push(workspaceTxid);
				defaultWorkspaceId = newWorkspace.id;
				logger("Created default workspace:", defaultWorkspaceId);
			} else {
				defaultWorkspaceId = serverWorkspaces[0].id;
			}

			// Sync forms to server (always create new forms with new IDs)
			const syncedForms: string[] = [];
			for (const localForm of localForms) {
				try {
					// Use default workspace for all forms
					const serverWorkspaceId = defaultWorkspaceId;
					const now = new Date();
					const newFormId = crypto.randomUUID();

					// Insert form with new ID (local forms may have conflicting IDs)
					await db.insert(forms).values({
						id: newFormId,
						createdByUserId: user.id,
						workspaceId: serverWorkspaceId,
						title: localForm.title || "Untitled",
						formName: localForm.formName || "draft",
						schemaName: localForm.schemaName || "draftFormSchema",
						content: localForm.content || [],
						settings: localForm.settings || {},
						icon: localForm.icon,
						cover: localForm.cover,
						isMultiStep: localForm.isMultiStep ?? false,
						status: localForm.status || "draft",
						createdAt: now,
						updatedAt: now,
					});

					// Capture txid immediately after insert for Electric sync tracking
					const txid = await getTxId();
					txids.push(txid);

					syncedForms.push(newFormId);
					logger(`Synced form "${localForm.title || "Untitled"}" as ${newFormId} to workspace ${serverWorkspaceId} (txid: ${txid})`);
				} catch (error) {
					console.error(`Failed to sync form "${localForm.title || "Untitled"}":`, error);
					// Continue with other forms
				}
			}

			logger(`Successfully synced ${syncedForms.length} forms to cloud`);
			return {
				success: true,
				syncedForms,
				txids,
				defaultWorkspaceId,
				workspaceTxid,
			};
		} catch (error) {
			console.error("Failed to sync forms to cloud:", error);
			throw error;
		}
	});

/**
 * Result type for syncLocalDataToCloud
 */
export type SyncResult = {
	success: boolean;
	txids: number[];
	syncedForms: string[];
	defaultWorkspaceId?: string;
	workspaceTxid?: number;
};

/**
 * Client-side function that coordinates the sync process
 * Syncs forms from localFormCollection (localStorage) to the cloud
 * Returns txids that can be used to wait for Electric sync
 */
export async function syncLocalDataToCloud(): Promise<SyncResult | null> {
	try {
		logger("Starting local data sync to cloud...");

		// Import localFormCollection (localStorage) to sync local forms to cloud
		const { localFormCollection } = await import("@/db-collections");

		// Get all local forms from localStorage
		const localForms = await localFormCollection.toArrayWhenReady();
		logger(`Found ${localForms.length} local forms to sync`);

		if (localForms.length === 0) {
			logger("No local data to sync");
			return null;
		}

		// Call server function to sync forms
		const result = await syncFormsToCloud({ data: localForms });
		logger("Sync result:", result);

		if (result.success) {
			logger("Server sync completed, clearing local data...");

			// Clear local data after successful server sync
			for (const localForm of localForms) {
				try {
					await localFormCollection.delete(localForm.id);
				} catch (error) {
					console.error(`Failed to delete local form ${localForm.id}:`, error);
				}
			}

			logger("Local data sync completed successfully!");
			return {
				success: true,
				txids: result.txids || [],
				syncedForms: result.syncedForms || [],
				defaultWorkspaceId: result.defaultWorkspaceId,
				workspaceTxid: result.workspaceTxid,
			};
		}

		return null;
	} catch (error) {
		console.error("Failed to sync local data to cloud:", error);
		throw error;
	}
}

/**
 * Checks if there is local data that needs to be synced
 */
export async function hasLocalDataToSync(): Promise<boolean> {
	try {
		const { localFormCollection } = await import("@/db-collections");
		const forms = await localFormCollection.toArrayWhenReady();
		return forms.length > 0;
	} catch (error) {
		console.error("Failed to check for local data:", error);
		return false;
	}
}