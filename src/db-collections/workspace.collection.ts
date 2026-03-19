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
    syncMode: "progressive",
    startSync: false, // Sync starts in _authenticated.tsx loader after auth is confirmed
    onInsert: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await createWorkspace({
            data: {
              id: m.modified.id,
              organizationId: m.modified.organizationId,
              name: m.modified.name,
            },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },

    onUpdate: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await updateWorkspace({
            data: { ...m.changes, id: m.original.id },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },

    onDelete: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await deleteWorkspace({
            data: { id: m.original.id },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },
  }),
);

export const createWorkspaceLocal = async (
  organizationId: string,
  name = "Collection",
): Promise<Workspace> => {
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
};

export const updateWorkspaceName = async (id: string, name: string): Promise<void> => {
  await workspaceCollection.update(id, (draft) => {
    draft.name = name;
    draft.updatedAt = new Date().toISOString();
  });
};

const _updateWorkspaceLocal = async (
  id: string,
  updater: (draft: Workspace) => void,
): Promise<void> => {
  await workspaceCollection.update(id, (draft) => {
    updater(draft);
    draft.updatedAt = new Date().toISOString();
  });
};

export const deleteWorkspaceLocal = async (id: string): Promise<void> => {
  await workspaceCollection.delete(id);
};
