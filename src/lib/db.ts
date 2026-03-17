import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

let dbInstance: ReturnType<typeof drizzle> | undefined;

/**
 * Get the database instance, initializing lazily if needed.
 * This ensures DATABASE_URL is read at runtime rather than build time.
 */
const getDb = () => {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Set it in your .env file or environment variables before running the server.",
      );
    }
    dbInstance = drizzle(url, {
      schema,
      relations: schema.relations,
    });
  }
  return dbInstance;
};

// Re-export for backwards compatibility
export const db = getDb();
