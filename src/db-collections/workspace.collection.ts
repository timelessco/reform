import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { createWorkspace, deleteWorkspace, updateWorkspace } from "@/lib/fn/workspaces";
import { electricFetchClient, getElectricUrl, timestampField } from "./shared";
import type { ServerTxResult } from "./shared";

const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdByUserId: z.string().optional(), // Server injects this from auth context
  name: z.string().default("My workspace"),
  createdAt: timestampField,
  updatedAt: timestampField,
});

type Workspace = z.infer<typeof WorkspaceSchema>;

export const workspaceCollection = createCollection(
  electricCollectionOptions({
    id: "workspaces",
    schema: WorkspaceSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "workspaces" },
      fetchClient: electricFetchClient,
      parser: {
        timestamptz: (date: string) => date,
        timestamp: (date: string) => date,
      },
    },
    getKey: (item) => item.id,
    startSync: false, // Sync starts in _authenticated.tsx loader after auth is confirmed
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      const result = (await createWorkspace({
        data: {
          id: newItem.id,
          organizationId: newItem.organizationId,
          name: newItem.name,
        },
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

export async function createWorkspaceLocal(
  organizationId: string,
  name = "Collection",
): Promise<Workspace> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newWorkspace: Workspace = {
    id,
    organizationId,
    // createdByUserId is injected by server from auth context
    name,
    createdAt: now,
    updatedAt: now,
  };

  await workspaceCollection.insert(newWorkspace);
  return newWorkspace;
}

export async function updateWorkspaceName(id: string, name: string): Promise<void> {
  await workspaceCollection.update(id, (draft) => {
    draft.name = name;
    draft.updatedAt = new Date().toISOString();
  });
}

async function updateWorkspaceLocal(id: string, updater: (draft: any) => void): Promise<void> {
  await workspaceCollection.update(id, (draft) => {
    updater(draft);
    draft.updatedAt = new Date().toISOString();
  });
}

export async function deleteWorkspaceLocal(id: string): Promise<void> {
  await workspaceCollection.delete(id);
}
