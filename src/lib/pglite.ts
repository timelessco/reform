import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import migrations from "@/db-collections/migrations.json";

let pgliteInstance: PGlite | null = null;
let drizzleInstance: PgliteDatabase<typeof schema> | null = null;
let initPromise: Promise<void> | null = null;

const LOCAL_DB_NAME = "idb://better-forms-local";

// ============================================================================
// Migration System
// ============================================================================

async function ensureMigrationsTable(db: PGlite) {
	await db.exec('CREATE SCHEMA IF NOT EXISTS drizzle');
	await db.exec(`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
		id SERIAL PRIMARY KEY,
		hash text NOT NULL,
		created_at bigint
	)`);
}

async function getMigratedHashes(db: PGlite) {
	const result = await db.query(`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at ASC`);
	return result.rows.map(row => (row as { hash: string }).hash);
}

async function recordMigration(db: PGlite, hash: string) {
	await db.exec(`
		INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
		VALUES ('${hash}', ${Date.now()})
		ON CONFLICT DO NOTHING
	`);
}

let migrationResolve: (() => void) | null = null;
const migrationPromise = new Promise<void>((resolve) => {
	migrationResolve = resolve;
});

export async function waitForMigrations() {
	await migrationPromise;
}

export async function runMigrations(db: PGlite) {
	try {
		console.log('🚀 Starting pglite migrations...');

		await ensureMigrationsTable(db);

		const executedHashes = await getMigratedHashes(db);
		const pendingMigrations = migrations.filter(migration => !executedHashes.includes(migration.hash));

		if (pendingMigrations.length === 0) {
			console.info('✨ No pending migrations found.');
			return;
		}

		console.info(`📦 Found ${pendingMigrations.length} pending migrations`);

		for (const migration of pendingMigrations) {
			console.info(`⚡ Executing migration: ${migration.hash}`);

			try {
				for (const sql of migration.sql) {
					await db.exec(sql);
				}

				await recordMigration(db, migration.hash);
				console.info(`✅ Successfully completed migration: ${migration.hash}`);
			} catch (error) {
				console.error(`❌ Failed to execute migration ${migration.hash}:`, error);
				throw error;
			}
		}

		console.info('🎉 All migrations completed successfully');
	} finally {
		if (migrationResolve) {
			migrationResolve();
		}
	}
}

async function initPGlite(): Promise<void> {
	if (typeof window === "undefined") {
		throw new Error("PGlite can only be used in browser environment");
	}

	const [wasmResponse, fsBundleResponse] = await Promise.all([
		fetch("/pglite/pglite.wasm"),
		fetch("/pglite/pglite.data"),
	]);

	const wasmModule = await WebAssembly.compileStreaming(wasmResponse);
	const fsBundle = await fsBundleResponse.blob();

	pgliteInstance = new PGlite(LOCAL_DB_NAME, {
		wasmModule,
		fsBundle,
	});
	await pgliteInstance.waitReady;

	// Run migrations
	await runMigrations(pgliteInstance);

	drizzleInstance = drizzle({ client: pgliteInstance, schema });
}

export async function getPGlite(): Promise<PGlite> {
	if (typeof window === "undefined") {
		throw new Error("PGlite can only be used in browser environment");
	}

	if (!initPromise) {
		initPromise = initPGlite();
	}

	await initPromise;

	if (!pgliteInstance) {
		throw new Error("PGlite failed to initialize");
	}

	return pgliteInstance;
}

export async function getLocalDb(): Promise<PgliteDatabase<typeof schema>> {
	if (typeof window === "undefined") {
		throw new Error("PGlite can only be used in browser environment");
	}

	if (!initPromise) {
		initPromise = initPGlite();
	}

	await initPromise;

	if (!drizzleInstance) {
		throw new Error("Drizzle instance failed to initialize");
	}

	return drizzleInstance;
}

export async function clearLocalDb(): Promise<void> {
	const pglite = await getPGlite();
	await pglite.exec(`
		DELETE FROM forms;
		DELETE FROM workspaces;
	`);
}

export function isLocalDbAvailable(): boolean {
	return typeof window !== "undefined";
}
