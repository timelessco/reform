import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forms, workspaces } from "@/db/schema";
import { authUser } from "@/lib/fn/helpers";
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

			// Get existing server workspaces
			const serverWorkspaces = await db
				.select({
					id: workspaces.id,
					name: workspaces.name,
					userId: workspaces.userId,
				})
				.from(workspaces)
				.where(eq(workspaces.userId, user.id))
				.orderBy(workspaces.createdAt);

			// Create default workspace if no workspaces exist on server
			let defaultWorkspaceId: string;
			if (serverWorkspaces.length === 0) {
				logger("Creating default workspace on server...");
				const now = new Date();
				const [newWorkspace] = await db
					.insert(workspaces)
					.values({
						id: crypto.randomUUID(),
						userId: user.id,
						name: "My workspace",
						createdAt: now,
						updatedAt: now,
					})
					.returning();
				defaultWorkspaceId = newWorkspace.id;
				logger("Created default workspace:", defaultWorkspaceId);
			} else {
				defaultWorkspaceId = serverWorkspaces[0].id;
			}

			// Get existing server forms to check for duplicates
			const existingServerForms = await db
				.select({
					id: forms.id,
					title: forms.title,
				})
				.from(forms)
				.where(eq(forms.userId, user.id));

			const existingFormIds = new Set(existingServerForms.map(f => f.id));

			// Sync forms to server
			const syncedForms = [];
			for (const localForm of localForms) {
				try {
					// Skip if form already exists on server
					if (existingFormIds.has(localForm.id)) {
						logger(`Form "${localForm.title || "Untitled"}" already exists on server, skipping`);
						continue;
					}

					// Use default workspace for all forms
					const serverWorkspaceId = defaultWorkspaceId;
					const now = new Date();

					// Insert form directly using Drizzle
					await db.insert(forms).values({
						id: localForm.id,
						userId: user.id,
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

					syncedForms.push(localForm.id);
					logger(`Synced form "${localForm.title || "Untitled"}" to workspace ${serverWorkspaceId}`);
				} catch (error) {
					console.error(`Failed to sync form "${localForm.title || "Untitled"}":`, error);
					// Continue with other forms
				}
			}

			logger(`Successfully synced ${syncedForms.length} forms to cloud`);
			return {
				success: true,
				syncedForms,
				defaultWorkspaceId
			};
		} catch (error) {
			console.error("Failed to sync forms to cloud:", error);
			throw error;
		}
	});

/**
 * Client-side function that coordinates the sync process
 */
export async function syncLocalDataToCloud(): Promise<void> {
	try {
		logger("Starting local data sync to cloud...");

		// Import formCollection here to avoid server-side imports
		const { formCollection } = await import("@/db-collections");

		// Get all local forms
		const localForms = await formCollection.toArrayWhenReady();
		logger(`Found ${localForms.length} local forms to sync`);

		if (localForms.length === 0) {
			logger("No local data to sync");
			return;
		}

		// Call server function to sync forms
		const result = await syncFormsToCloud({ data: localForms });

		if (result.success) {
			logger("Server sync completed, clearing local data...");

			// Clear local data after successful server sync
			for (const localForm of localForms) {
				try {
					await formCollection.delete(localForm.id);
				} catch (error) {
					console.error(`Failed to delete local form ${localForm.id}:`, error);
				}
			}

			logger("Local data sync completed successfully!");
		}
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
		const { formCollection } = await import("@/db-collections");
		const forms = await formCollection.toArrayWhenReady();
		return forms.length > 0;
	} catch (error) {
		console.error("Failed to check for local data:", error);
		return false;
	}
}