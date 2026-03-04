import { createTransaction } from "@tanstack/react-db";
import { logger } from "@/lib/utils";
import { localFormCollection, localFormSettingsCollection } from "@/db-collections";
import { formCollection } from "@/db-collections/form.collections";
import { formSettingsCollection } from "@/db-collections/form-settings.collection";
import { workspaceCollection, createWorkspaceLocal } from "@/db-collections/workspace.collection";
import { createForm } from "@/lib/fn/forms";

/**
 * Result type for syncLocalDataToCloud
 */
type SyncResult = {
  success: boolean;
  syncedForms: string[];
};

/**
 * Client-side function that syncs local forms to the cloud using createTransaction.
 *
 * For each local form, creates a transaction that:
 * - mutationFn: calls createForm() (creates form + default settings server-side),
 *   then updateFormSettings() with all local settings overrides using the returned settingsId.
 * - tx.mutate(): optimistically inserts form into formCollection, deletes from local collections.
 *
 * This eliminates the race condition (settings are updated via settingsId returned from createForm),
 * syncs all 23 settings fields (not a hardcoded subset), and rolls back on error.
 *
 * @param organizationId - The organization ID to sync forms to
 */
export async function syncLocalDataToCloud(organizationId: string): Promise<SyncResult | null> {
  try {
    logger("Starting local data sync to cloud via createTransaction...");
    logger(`Organization ID: ${organizationId}`);

    if (!organizationId) {
      console.error("syncLocalDataToCloud: organizationId is required");
      throw new Error("Organization ID is required for sync");
    }

    // Get all local forms from localStorage
    const localForms = await localFormCollection.toArrayWhenReady();
    logger(`Found ${localForms.length} local forms to sync`);

    if (localForms.length === 0) {
      logger("No local data to sync");
      return null;
    }

    // Get existing workspaces or create one
    const existingWorkspaces = await workspaceCollection.toArrayWhenReady();
    const orgWorkspaces = existingWorkspaces.filter((ws) => ws.organizationId === organizationId);

    let targetWorkspaceId: string;
    if (orgWorkspaces.length === 0) {
      logger("No workspace found, creating via Electric collection...");
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

    // Build a map of local form settings keyed by formId
    const localSettings = await localFormSettingsCollection.toArrayWhenReady();
    const localSettingsMap = new Map(localSettings.map((s) => [s.formId, s]));

    // Sync each local form via createTransaction
    const syncedForms: string[] = [];
    for (const localForm of localForms) {
      try {
        const newFormId = crypto.randomUUID();
        const now = new Date().toISOString();

        const newFormData = {
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
          status: (localForm.status || "draft") as "draft" | "published" | "archived",
          createdAt: now,
          updatedAt: now,
        };

        const formLocalSettings = localSettingsMap.get(localForm.id);
        const newSettingsId = crypto.randomUUID();

        // Extract settings overrides once (used in both mutationFn and tx.mutate)
        let settingsOverrides: Record<string, unknown> | null = null;
        if (formLocalSettings) {
          const {
            id: _localId,
            formId: _localFormId,
            createdAt: _ca,
            updatedAt: _ua,
            ...overrides
          } = formLocalSettings;
          settingsOverrides = overrides;
        }

        const tx = createTransaction({
          mutationFn: async () => {
            // Create form + settings with overrides in a single server transaction (one txid)
            const createResult = await createForm({
              data: {
                ...newFormData,
                settingsId: newSettingsId,
                settingsData: settingsOverrides ?? undefined,
              },
            });
            const txid = (createResult as { txid: number }).txid;

            // Keep optimistic overlay alive until Electric sync confirms the data.
            // Without this, the transaction completes and the optimistic overlay is removed
            // before the sync stream delivers the real data, causing a ~5s skeleton flash.
            await Promise.all([
              formCollection.utils.awaitTxId(txid),
              formSettingsCollection.utils.awaitTxId(txid),
            ]);
          },
        });

        tx.mutate(() => {
          formCollection.insert(newFormData);

          // Always optimistically insert settings so UI never shows skeleton.
          // Server's createForm() always creates a default settings row,
          // so we mirror that here with any local overrides applied.
          formSettingsCollection.insert({
            id: newSettingsId,
            formId: newFormId,
            ...(settingsOverrides ?? {}),
            createdAt: now,
            updatedAt: now,
          });

          localFormCollection.delete(localForm.id);
          if (formLocalSettings) {
            localFormSettingsCollection.delete(formLocalSettings.id);
          }
        });

        syncedForms.push(newFormId);
        logger(
          `Synced form "${localForm.title || "Untitled"}" as ${newFormId} via createTransaction`,
        );
      } catch (error) {
        console.error(`Failed to sync form "${localForm.title || "Untitled"}":`, error);
        // Continue with other forms
      }
    }

    logger(`Successfully synced ${syncedForms.length} forms via createTransaction`);
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
    const forms = await localFormCollection.toArrayWhenReady();
    return forms.length > 0;
  } catch (error) {
    console.error("Failed to check for local data:", error);
    return false;
  }
}
