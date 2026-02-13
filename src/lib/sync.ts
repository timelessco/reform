import { forms, member, organization, workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { getTxId } from "@/lib/fn/helpers";
import { logger } from "@/lib/utils";
import { authMiddleware } from "@/middleware/auth";
import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";

/**
 * Server function to sync forms to the cloud
 */
const syncFormsToCloud = createServerFn({ method: "POST" })
  .inputValidator((forms: any[]) => forms)
  .middleware([authMiddleware])
  .handler(async ({ data: localForms, context }) => {
    try {
      logger("Starting server-side form sync...");

      if (!localForms || localForms.length === 0) {
        logger("No forms to sync");
        return { success: true };
      }

      // Track all txids for Electric sync
      const txids: number[] = [];

      // Get user's organization memberships
      const userMemberships = await db
        .select({ organizationId: member.organizationId })
        .from(member)
        .where(eq(member.userId, context.session.user.id));

      if (userMemberships.length === 0) {
        logger("User has no organization memberships, creating default org...");
        // Create a default organization for the user
        const now = new Date();
        const newOrgId = crypto.randomUUID();
        const orgTxid = await db.transaction(async (tx) => {
          await tx.insert(organization).values({
            id: newOrgId,
            name: `${context.session.user.name || context.session.user.email}'s Organization`,
            slug: `org-${newOrgId.slice(0, 8)}`,
            createdAt: now,
          });
          await tx.insert(member).values({
            id: crypto.randomUUID(),
            userId: context.session.user.id,
            organizationId: newOrgId,
            role: "owner",
            createdAt: now,
          });
          return getTxId(tx);
        });
        txids.push(orgTxid);
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
        const { workspaceId, txid } = await db.transaction(async (tx) => {
          const [newWorkspace] = await tx
            .insert(workspaces)
            .values({
              id: crypto.randomUUID(),
              organizationId: defaultOrgId,
              createdByUserId: context.session.user.id,
              name: "My workspace",
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          const txid = await getTxId(tx);
          return { workspaceId: newWorkspace.id, txid };
        });
        workspaceTxid = txid;
        txids.push(workspaceTxid);
        defaultWorkspaceId = workspaceId;
        logger("Created default workspace:", defaultWorkspaceId);
      } else {
        defaultWorkspaceId = serverWorkspaces[0].id;
      }

      // Sync forms to server (always create new forms with new IDs)
      const syncedForms: string[] = [];
      for (const localForm of localForms) {
        try {
          const serverWorkspaceId = defaultWorkspaceId;
          const now = new Date();
          const newFormId = crypto.randomUUID();

          const txid = await db.transaction(async (tx) => {
            await tx.insert(forms).values({
              id: newFormId,
              createdByUserId: context.session.user.id,
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
            return getTxId(tx);
          });

          txids.push(txid);
          syncedForms.push(newFormId);
          logger(
            `Synced form "${localForm.title || "Untitled"}" as ${newFormId} to workspace ${serverWorkspaceId} (txid: ${txid})`,
          );
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

const AWAIT_TXID_TIMEOUT_MS = 10000;
const AWAIT_MATCH_TIMEOUT_MS = 15000;

/**
 * Awaits Electric sync for all txids from a sync result.
 * Must be called client-side (uses formCollection, workspaceCollection).
 * Preloads collections first so Electric streams are active (required when called
 * from verify-email/signup before navigating to dashboard).
 *
 * Strategy (from TanStack electric-db-collection tests):
 * 1. Try awaitTxId first (works when txids match what Electric sends).
 * 2. On timeout, fall back to awaitMatch - match on inserted row IDs (workspace id, form ids).
 *    This is more reliable with Electric Cloud where txids may not match or replication lag exists.
 */
export async function awaitSyncTxids(result: SyncResult): Promise<void> {
  const { workspaceCollection, formCollection } = await import("@/db-collections");
  const { isChangeMessage } = await import("@tanstack/electric-db-collection");

  // Start Electric sync streams (e.g. when on verify-email, _authenticated layout hasn't loaded yet)
  await Promise.all([workspaceCollection.preload(), formCollection.preload()]);

  const tryAwaitTxId = async () => {
    if (!result.txids.length) return;
    if (result.workspaceTxid !== undefined) {
      await workspaceCollection.utils.awaitTxId(result.workspaceTxid, AWAIT_TXID_TIMEOUT_MS);
    }
    const formTxids =
      result.syncedForms.length > 0 ? result.txids.slice(-result.syncedForms.length) : [];
    await Promise.all(
      formTxids.map((txid) => formCollection.utils.awaitTxId(txid, AWAIT_TXID_TIMEOUT_MS)),
    );
  };

  const fallbackAwaitMatch = async () => {
    const promises: Promise<boolean>[] = [];
    if (result.defaultWorkspaceId) {
      const targetId = result.defaultWorkspaceId;
      promises.push(
        workspaceCollection.utils.awaitMatch(
          ((msg: unknown) =>
            isChangeMessage(msg as import("@electric-sql/client").Message<Record<string, unknown>>) &&
            (msg as { headers?: { operation?: string }; value?: { id?: string } }).headers?.operation === "insert" &&
            (msg as { headers?: { operation?: string }; value?: { id?: string } }).value?.id === targetId) as Parameters<typeof workspaceCollection.utils.awaitMatch>[0],
          AWAIT_MATCH_TIMEOUT_MS,
        ),
      );
    }
    for (const formId of result.syncedForms) {
      promises.push(
        formCollection.utils.awaitMatch(
          ((msg: unknown) =>
            isChangeMessage(msg as import("@electric-sql/client").Message<Record<string, unknown>>) &&
            (msg as { headers?: { operation?: string }; value?: { id?: string } }).headers?.operation === "insert" &&
            (msg as { headers?: { operation?: string }; value?: { id?: string } }).value?.id === formId) as Parameters<typeof formCollection.utils.awaitMatch>[0],
          AWAIT_MATCH_TIMEOUT_MS,
        ),
      );
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  try {
    await tryAwaitTxId();
  } catch (error) {
    const isTimeout =
      error && typeof error === "object" && "name" in error && error.name === "TimeoutWaitingForTxIdError";
    if (isTimeout && (result.defaultWorkspaceId || result.syncedForms.length > 0)) {
      logger("awaitTxId timed out, using awaitMatch fallback (match by row id)");
      await fallbackAwaitMatch();
    } else if (isTimeout) {
      logger("awaitTxId timed out, no ids to match - data will sync eventually");
    } else {
      throw error;
    }
  }
}

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
async function hasLocalDataToSync(): Promise<boolean> {
  try {
    const { localFormCollection } = await import("@/db-collections");
    const forms = await localFormCollection.toArrayWhenReady();
    return forms.length > 0;
  } catch (error) {
    console.error("Failed to check for local data:", error);
    return false;
  }
}
