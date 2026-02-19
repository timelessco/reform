import { logger } from "@/lib/utils";

/**
 * Result type for syncLocalDataToCloud
 */
type SyncResult = {
  success: boolean;
  syncedForms: string[];
};

/**
 * Client-side function that syncs local forms to the cloud via Electric collections.
 *
 * Instead of inserting directly into PostgreSQL (which causes 409 Conflict errors
 * when Electric shapes have stale handles), this uses formCollection.insert() which:
 * 1. Inserts locally into the Electric collection
 * 2. Triggers onInsert callback that calls createForm() server function
 * 3. Server writes to PostgreSQL with proper auth context
 * 4. Electric tracks the txid and syncs automatically
 *
 * @param organizationId - The organization ID to sync forms to
 */
export async function syncLocalDataToCloud(organizationId: string): Promise<SyncResult | null> {
  try {
    logger("Starting local data sync to cloud via Electric collections...");
    logger(`Organization ID: ${organizationId}`);

    // Validate organizationId
    if (!organizationId) {
      console.error("syncLocalDataToCloud: organizationId is required");
      throw new Error("Organization ID is required for sync");
    }

    // Import collections
    const { localFormCollection } = await import("@/db-collections");
    const { formCollection } = await import("@/db-collections/form.collections");
    const { workspaceCollection, createWorkspaceLocal } =
      await import("@/db-collections/workspace.collection");

    // Get all local forms from localStorage
    const localForms = await localFormCollection.toArrayWhenReady();
    logger(`Found ${localForms.length} local forms to sync`);

    if (localForms.length === 0) {
      logger("No local data to sync");
      return null;
    }

    // Get existing workspaces or create one via Electric collection
    const existingWorkspaces = await workspaceCollection.toArrayWhenReady();
    const orgWorkspaces = existingWorkspaces.filter((ws) => ws.organizationId === organizationId);

    let targetWorkspaceId: string;
    if (orgWorkspaces.length === 0) {
      // Create workspace via Electric collection (triggers onInsert → createWorkspace server fn)
      logger("No workspace found, creating via Electric collection...");
      logger(`Creating workspace with organizationId: ${organizationId}`);
      try {
        const newWorkspace = await createWorkspaceLocal(organizationId, "My workspace");
        targetWorkspaceId = newWorkspace.id;
        logger(`Created workspace ${targetWorkspaceId} via Electric collection`);
      } catch (wsError) {
        console.error("Failed to create workspace:", wsError);
        throw wsError;
      }
    } else {
      targetWorkspaceId = orgWorkspaces[0].id;
      logger(`Using existing workspace ${targetWorkspaceId}`);
    }

    // Sync each local form via Electric collection
    const syncedForms: string[] = [];
    for (const localForm of localForms) {
      try {
        const newFormId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Insert via Electric collection (triggers onInsert → createForm server fn)
        await formCollection.insert({
          id: newFormId,
          workspaceId: targetWorkspaceId,
          createdByUserId: "", // Server will use context.session.user.id
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

        syncedForms.push(newFormId);
        logger(
          `Synced form "${localForm.title || "Untitled"}" as ${newFormId} via Electric collection`,
        );

        // Delete from localStorage after successful sync
        await localFormCollection.delete(localForm.id);
      } catch (error) {
        console.error(`Failed to sync form "${localForm.title || "Untitled"}":`, error);
        // Continue with other forms
      }
    }

    logger(`Successfully synced ${syncedForms.length} forms via Electric collections`);
    return {
      success: true,
      syncedForms,
    };
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
