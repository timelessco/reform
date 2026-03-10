import { put } from "@vercel/blob";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth";

/**
 * Upload avatar image to Vercel Blob storage
 * Accepts base64 image data and returns the public URL
 */
export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      base64: z.string(), // Base64 encoded image data (data:image/png;base64,...)
      filename: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    // Extract the base64 data (remove data:image/xxx;base64, prefix)
    const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Determine content type from base64 prefix
    const contentTypeMatch = data.base64.match(/^data:(image\/\w+);base64,/);
    const contentType = contentTypeMatch?.[1] || "image/png";

    // Generate filename with user ID for uniqueness
    const extension = contentType.split("/")[1] || "png";
    const filename =
      data.filename || `avatar-${userId}-${Date.now()}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(`avatars/${filename}`, buffer, {
      access: "public",
      contentType,
      token: process.env.BETTER_FORM_READ_WRITE_TOKEN,
    });

    return { url: blob.url };
  });
