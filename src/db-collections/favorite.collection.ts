import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { addFavorite, removeFavorite } from "@/lib/fn/favorites";
import { electricFetchClient, getElectricUrl, handleElectricError, timestampField } from "./shared";
import type { ServerTxResult } from "./shared";

const FormFavoriteSchema = z.object({
  id: z.string(), // Format: ${userId}:${formId}
  userId: z.string(),
  formId: z.uuid(),
  createdAt: timestampField,
});

type _FormFavorite = z.infer<typeof FormFavoriteSchema>;

export const favoriteCollection = createCollection(
  electricCollectionOptions({
    id: "form_favorites",
    schema: FormFavoriteSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "form_favorites" },
      fetchClient: electricFetchClient,
      onError: handleElectricError,
      parser: {
        timestamptz: (date: string) => date,
        timestamp: (date: string) => date,
      },
    },
    getKey: (item) => item.id,
    startSync: false, // Sync starts in _authenticated.tsx loader after auth is confirmed
    syncMode: "on-demand",
    onInsert: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await addFavorite({
            data: { formId: m.modified.formId },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },
    onDelete: async ({ transaction }) => {
      const txids = await Promise.all(
        transaction.mutations.map(async (m) => {
          const result = (await removeFavorite({
            data: { formId: m.original.formId },
          })) as ServerTxResult;
          return result.txid;
        }),
      );
      return { txid: txids };
    },
  }),
);

export const toggleFavoriteLocal = async (userId: string, formId: string): Promise<void> => {
  const id = `${userId}:${formId}`;
  const existing = favoriteCollection.state.get(id);

  if (existing) {
    await favoriteCollection.delete(id);
  } else {
    await favoriteCollection.insert({
      id,
      userId,
      formId,
      createdAt: new Date().toISOString(),
    });
  }
};

const _addFavoriteLocal = async (userId: string, formId: string): Promise<void> => {
  const id = `${userId}:${formId}`;
  await favoriteCollection.insert({
    id,
    userId,
    formId,
    createdAt: new Date().toISOString(),
  });
};

const _removeFavoriteLocal = async (userId: string, formId: string): Promise<void> => {
  await favoriteCollection.delete(`${userId}:${formId}`);
};

const _isFavoriteLocal = (userId: string, formId: string): boolean => {
  const id = `${userId}:${formId}`;
  return favoriteCollection.state.has(id);
};
