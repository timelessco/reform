import { createTransaction } from "@tanstack/react-db";
import { getLocalFormCollection, isLocalFormCollectionReady } from "@/collections/local/form";
import { getFormListings, getWorkspaces, createWorkspaceLocal } from "@/collections";
import type { FormListing } from "@/collections";
import { createForm } from "@/lib/server-fn/forms";

type SyncResult = {
  success: boolean;
  syncedForms: string[];
};

/**
 * Migrate local draft forms to the cloud on first authenticated visit.
 * Creates a workspace if none exists, then runs one optimistic transaction
 * per draft (server insert + local collection insert + local draft delete).
 * No-ops if no drafts are present or the local collection isn't ready.
 */
export const syncLocalDataToCloud = async (organizationId: string): Promise<SyncResult | null> => {
  try {
    if (!organizationId) {
      throw new Error("Organization ID is required for sync");
    }

    if (!isLocalFormCollectionReady()) {
      console.warn("[sync] local collection not ready — skipping");
      return null;
    }

    const localCollection = getLocalFormCollection();
    const localForms = await localCollection.toArrayWhenReady();
    if (localForms.length === 0) return null;

    const existingWorkspaces = Array.from((await getWorkspaces().stateWhenReady()).values());
    const orgWorkspaces = existingWorkspaces.filter((ws) => ws.organizationId === organizationId);

    let targetWorkspaceId: string;
    if (orgWorkspaces.length === 0) {
      const newWorkspace = await createWorkspaceLocal(organizationId, "My workspace");
      targetWorkspaceId = newWorkspace.id;
    } else {
      targetWorkspaceId = orgWorkspaces[0].id;
    }

    const syncedForms: string[] = [];
    for (const localForm of localForms) {
      try {
        const newFormId = crypto.randomUUID();
        const now = new Date().toISOString();

        const newFormData = {
          id: newFormId,
          workspaceId: targetWorkspaceId,
          createdByUserId: "", // Server fills from session
          title: localForm.title || "Untitled",
          formName: localForm.formName || "draft",
          schemaName: localForm.schemaName || "draftFormSchema",
          content: localForm.content || [],
          settings: localForm.settings || {},
          icon: localForm.icon,
          cover: localForm.cover,
          isMultiStep: localForm.isMultiStep ?? false,
          status: (localForm.status || "draft") as "draft" | "published" | "archived",
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
            await createForm({ data: newFormData });
            await getFormListings().utils.refetch();
          },
        });

        tx.mutate(() => {
          getFormListings().insert(newFormData as unknown as FormListing);
          localCollection.delete(localForm.id);
        });

        syncedForms.push(newFormId);
      } catch (error) {
        console.error(`[sync] Failed to sync form "${localForm.title || "Untitled"}":`, error);
      }
    }

    // Nuke the legacy localStorage fallback key in case it lingers from a
    // pre-SQLite session — SQLite rows are cleared by the tx.mutate above.
    if (syncedForms.length > 0 && typeof window !== "undefined") {
      localStorage.removeItem("draft-form");
    }

    return { success: true, syncedForms };
  } catch (error) {
    console.error("[sync] Failed to sync local data to cloud:", error);
    throw error;
  }
};

export const hasLocalDataToSync = async (): Promise<boolean> => {
  try {
    if (!isLocalFormCollectionReady()) return false;
    const forms = await getLocalFormCollection().toArrayWhenReady();
    return forms.length > 0;
  } catch (error) {
    console.error("[sync] Failed to check for local data:", error);
    return false;
  }
};
