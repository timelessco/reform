import * as schema from "@/db/schema";
import { createRequire } from "node:module";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type Db = NodePgDatabase<typeof schema>;

// `drizzle-orm/node-postgres` (which pulls in `pg`) is loaded lazily via
// Node's `createRequire`. A static `import { drizzle } from
// "drizzle-orm/node-postgres"` here would land `pg` in the client bundle
// the moment any client-reachable file does `import { db } from "@/db"` —
// Vite dev mode does not tree-shake top-level imports, and TanStack Start's
// server-fn transform only strips handler bodies, not module-scope imports.
// Doing the require lazily keeps `pg` out of Vite's client graph entirely,
// while still working unchanged on the server (every `db.*` call only ever
// happens inside a server fn or API route handler, both server-only
// execution contexts). Using the static `node:module` import (instead of
// `process.getBuiltinModule("node:module")`) is what lets Vercel's NFT
// tracer detect the require and bundle `drizzle-orm/node-postgres` + `pg`
// into the deployed lambda.

type NodeProcess = {
  versions?: { node?: string };
  env: Record<string, string | undefined>;
};

const nodeProcess = (globalThis as unknown as { process?: NodeProcess }).process;

const isNode = typeof nodeProcess?.versions?.node === "string";

let dbInstance: Db | undefined;

const initDb = (): Db => {
  if (dbInstance) return dbInstance;

  if (!isNode || !nodeProcess) {
    throw new Error(
      "`@/db` is server-only — accessed from a non-Node environment. This is a bundle leak; the call site needs to move into a server fn handler or an API route.",
    );
  }

  const requireFn = createRequire(import.meta.url);
  const { drizzle } = requireFn(
    "drizzle-orm/node-postgres",
  ) as typeof import("drizzle-orm/node-postgres");

  const url = nodeProcess.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Set it in your .env file or environment variables before running the server.",
    );
  }

  dbInstance = drizzle(url, {
    schema,
    relations: schema.relations,
  });
  return dbInstance;
};

// Lazy proxy: `db.method(...)` triggers `initDb()` on first access, then
// delegates every property access to the real drizzle instance. Mirrors the
// previous synchronous-access shape so no consumer needs to change.
export const db: Db = new Proxy({} as Db, {
  get(_, prop, receiver) {
    return Reflect.get(initDb() as object, prop, receiver);
  },
  has(_, prop) {
    return Reflect.has(initDb() as object, prop);
  },
}) as Db;
