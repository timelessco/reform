import { createWorkspace, deleteWorkspace, updateWorkspace } from "@/lib/fn/workspaces";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { type ServerTxResult, getElectricUrl, timestampField } from "./shared";

// ============================================================================
// Workspace Schema (extends DB schema with timestamp transforms)
// NOTE: userId is optional because it's injected by the server on insert.
// ============================================================================

export const WorkspaceSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().optional(), // Injected by server
    name: z.string().default("My workspace"),
    createdAt: timestampField,
    updatedAt: timestampField,
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

// ============================================================================
// Workspace Collection with ElectricSQL sync
// ============================================================================

export const workspaceCollection = createCollection(
    electricCollectionOptions({
        id: "workspaces",
        schema: WorkspaceSchema,
        shapeOptions: {
            url: getElectricUrl(),
            params: { table: "workspaces" },
        },
        getKey: (item) => item.id,

        onInsert: async ({ transaction }) => {
            const newItem = transaction.mutations[0].modified;
            const result = (await createWorkspace({
                data: { id: newItem.id, name: newItem.name },
            })) as ServerTxResult;
            return { txid: result.txid };
        },

        onUpdate: async ({ transaction }) => {
            const { original, changes } = transaction.mutations[0];
            const result = await updateWorkspace({
                data: { ...changes, id: original.id },
            });
            return { txid: (result as ServerTxResult).txid };
        },

        onDelete: async ({ transaction }) => {
            const deletedItem = transaction.mutations[0].original;
            const result = (await deleteWorkspace({
                data: { id: deletedItem.id },
            })) as ServerTxResult;
            return { txid: result.txid };
        },
    }),
);

/**
 * Creates a new workspace with default values and returns the new workspace.
 */
export async function createWorkspaceLocal(
    name = "My workspace",
): Promise<Workspace> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
        id,
        userId: "", // Injected by server
        name,
        createdAt: now,
        updatedAt: now,
    };

    await workspaceCollection.insert(newWorkspace);
    return newWorkspace;
}

/**
 * Updates a workspace's name.
 */
export async function updateWorkspaceName(
    id: string,
    name: string,
): Promise<void> {
    await workspaceCollection.update(id, (draft) => {
        draft.name = name;
        draft.updatedAt = new Date().toISOString();
    });
}

/**
 * Generic update for workspace.
 */
export async function updateWorkspaceLocal(
    id: string,
    updater: (draft: any) => void,
): Promise<void> {
    await workspaceCollection.update(id, (draft) => {
        updater(draft);
        draft.updatedAt = new Date().toISOString();
    });
}

/**
 * Deletes a workspace by ID.
 * Note: This will also delete all forms in the workspace via cascade delete on the server.
 */
export async function deleteWorkspaceLocal(id: string): Promise<void> {
    await workspaceCollection.delete(id);
}
