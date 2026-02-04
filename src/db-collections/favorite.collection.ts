import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { z } from "zod";
import { addFavorite, removeFavorite } from "@/lib/fn/favorites";
import { electricFetchClient, getElectricUrl, type ServerTxResult, timestampField } from "./shared";

export const FormFavoriteSchema = z.object({
  id: z.string(), // Format: ${userId}:${formId}
  userId: z.string(),
  formId: z.string().uuid(),
  createdAt: timestampField,
});

export type FormFavorite = z.infer<typeof FormFavoriteSchema>;

export const favoriteCollection = createCollection(
  electricCollectionOptions({
    id: "form_favorites",
    schema: FormFavoriteSchema,
    shapeOptions: {
      url: getElectricUrl(),
      params: { table: "form_favorites" },
      fetchClient: electricFetchClient,
    },
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      const result = (await addFavorite({
        data: { formId: newItem.formId },
      })) as ServerTxResult;
      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const deletedItem = transaction.mutations[0].original;
      const result = (await removeFavorite({
        data: { formId: deletedItem.formId },
      })) as ServerTxResult;
      return { txid: result.txid };
    },
  }),
);

export async function toggleFavoriteLocal(userId: string, formId: string): Promise<void> {
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
}

export async function addFavoriteLocal(userId: string, formId: string): Promise<void> {
  const id = `${userId}:${formId}`;
  await favoriteCollection.insert({
    id,
    userId,
    formId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeFavoriteLocal(userId: string, formId: string): Promise<void> {
  await favoriteCollection.delete(`${userId}:${formId}`);
}

export function isFavoriteLocal(userId: string, formId: string): boolean {
  const id = `${userId}:${formId}`;
  return favoriteCollection.state.has(id);
}
