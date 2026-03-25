import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

console.log("Connecting to database...");
const db = drizzle(DATABASE_URL);

console.log("Dropping all tables...");
await db.execute(sql`
  DO $$ DECLARE
    r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
    END LOOP;
  END $$;
`);

console.log("All tables dropped.");
process.exit(0);
