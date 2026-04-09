import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { formFavorites } from "@/db/schema";
import { db } from "@/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const getFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session.user.id;

    const favs = await db.select().from(formFavorites).where(eq(formFavorites.userId, userId));

    return favs.map((f) => ({
      id: f.id,
      userId: f.userId,
      formId: f.formId,
      createdAt: f.createdAt.toISOString(),
    }));
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const id = `${userId}:${data.formId}`;

    await db
      .insert(formFavorites)
      .values({
        id,
        userId,
        formId: data.formId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ formId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    await db
      .delete(formFavorites)
      .where(and(eq(formFavorites.userId, userId), eq(formFavorites.formId, data.formId)));
  });
