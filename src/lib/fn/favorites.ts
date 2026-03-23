import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { formFavorites } from "@/db/schema";
import { db } from "@/lib/db";
import { authMiddleware } from "@/middleware/auth";
import { getTxId } from "./helpers";

export const getFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const favorites = await db
      .select()
      .from(formFavorites)
      .where(eq(formFavorites.userId, context.session.user.id));

    return {
      favorites: favorites.map((favorite) => ({
        ...favorite,
        createdAt: favorite.createdAt.toISOString(),
      })),
    };
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const id = `${userId}:${data.formId}`;

    return await db.transaction(async (tx) => {
      await tx
        .insert(formFavorites)
        .values({
          id,
          userId,
          formId: data.formId,
          createdAt: new Date(),
        })
        .onConflictDoNothing();

      const txid = await getTxId(tx);
      return { txid };
    });
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    return await db.transaction(async (tx) => {
      await tx
        .delete(formFavorites)
        .where(and(eq(formFavorites.userId, userId), eq(formFavorites.formId, data.formId)));

      const txid = await getTxId(tx);
      return { txid };
    });
  });
