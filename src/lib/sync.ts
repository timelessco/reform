import { createTransaction } from "@tanstack/react-db";
import { logger } from "@/lib/utils";
import { localFormCollection } from "@/db-collections/form.collections";
import { formCollection } from "@/db-collections/form.collections";
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
 * - mutationFn: calls createForm() (creates form with all settings in a single row),
 *   then awaits txid for Electric sync.
 * - tx.mutate(): optimistically inserts form into formCollection, deletes from local collection.
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
          // Include settings fields from local form (they're now part of the form)
          language: localForm.language,
          redirectOnCompletion: localForm.redirectOnCompletion,
          redirectUrl: localForm.redirectUrl,
          redirectDelay: localForm.redirectDelay,
          progressBar: localForm.progressBar,
          branding: localForm.branding,
          autoJump: localForm.autoJump,
          saveAnswersForLater: localForm.saveAnswersForLater,
          selfEmailNotifications: localForm.selfEmailNotifications,
          notificationEmail: localForm.notificationEmail,
          respondentEmailNotifications: localForm.respondentEmailNotifications,
          respondentEmailSubject: localForm.respondentEmailSubject,
          respondentEmailBody: localForm.respondentEmailBody,
          passwordProtect: localForm.passwordProtect,
          password: localForm.password,
          closeForm: localForm.closeForm,
          closedFormMessage: localForm.closedFormMessage,
          closeOnDate: localForm.closeOnDate,
          closeDate: localForm.closeDate,
          limitSubmissions: localForm.limitSubmissions,
          maxSubmissions: localForm.maxSubmissions,
          preventDuplicateSubmissions: localForm.preventDuplicateSubmissions,
          dataRetention: localForm.dataRetention,
          dataRetentionDays: localForm.dataRetentionDays,
          customization: localForm.customization,
          createdAt: now,
          updatedAt: now,
        };

        const tx = createTransaction({
          mutationFn: async () => {
            const createResult = await createForm({
              data: newFormData,
            });
            const txid = (createResult as { txid: number }).txid;

            // Keep optimistic overlay alive until Electric sync confirms the data.
            await formCollection.utils.awaitTxId(txid);
          },
        });

        tx.mutate(() => {
          formCollection.insert(newFormData);
          localFormCollection.delete(localForm.id);
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
