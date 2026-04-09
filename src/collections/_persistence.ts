/**
 * Lazy singleton for the TanStack DB 0.6 SQLite (WA-SQLite + OPFS) persistence layer.
 *
 * - Browser-only. Returns `null` on the server so collection factories can
 *   fall back to non-persisted options under SSR.
 * - Init is async (OPFS Worker bootstrap). Callers should `await getPersistence()`
 *   before creating persisted collections.
 * - Fails soft: if OPFS is unavailable (old Safari, private mode quirks), logs
 *   and returns null so the app still works without persistence.
 */

import type {
  BrowserCollectionCoordinator,
  PersistedCollectionPersistence,
} from "@tanstack/browser-db-sqlite-persistence";

type PersistenceBundle = {
  persistence: PersistedCollectionPersistence;
  coordinator: BrowserCollectionCoordinator;
  dispose: () => Promise<void>;
};

let bundlePromise: Promise<PersistenceBundle | null> | null = null;

// Fail fast if OPFS init hangs — a stuck worker must not hang the whole app.
const INIT_TIMEOUT_MS = 5000;

const initPersistence = async (): Promise<PersistenceBundle | null> => {
  if (typeof window === "undefined") return null;

  const work = (async () => {
    const {
      BrowserCollectionCoordinator,
      createBrowserWASQLitePersistence,
      openBrowserWASQLiteOPFSDatabase,
    } = await import("@tanstack/browser-db-sqlite-persistence");

    const database = await openBrowserWASQLiteOPFSDatabase({
      databaseName: "better-form.sqlite",
    });

    const coordinator = new BrowserCollectionCoordinator({ dbName: "better-form" });
    const persistence = createBrowserWASQLitePersistence({ database, coordinator });

    const dispose = async () => {
      try {
        coordinator.dispose();
      } catch (err) {
        console.warn("[persistence] coordinator dispose failed", err);
      }
      try {
        await database.close?.();
      } catch (err) {
        console.warn("[persistence] database close failed", err);
      }
    };

    return { persistence, coordinator, dispose } satisfies PersistenceBundle;
  })();

  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), INIT_TIMEOUT_MS)),
    ]);
  } catch (err) {
    console.warn(
      "[persistence] SQLite persistence unavailable — continuing without local cache",
      err,
    );
    return null;
  }
};

/**
 * Returns the SQLite persistence bundle, initializing it on first call.
 * Safe to call repeatedly — init runs once per page load.
 */
export const getPersistence = (): Promise<PersistenceBundle | null> => {
  if (!bundlePromise) {
    bundlePromise = initPersistence();
  }
  return bundlePromise;
};

/**
 * Dispose the persistence layer. Call on full logout to release
 * BroadcastChannel + Web Lock handles.
 */
export const disposePersistence = async (): Promise<void> => {
  if (!bundlePromise) return;
  const bundle = await bundlePromise;
  bundlePromise = null;
  if (bundle) await bundle.dispose();
};

/**
 * Best-effort wipe of the OPFS-backed SQLite database file. Called on
 * logout so the next user on the same browser doesn't see the previous
 * user's data. Runs AFTER `disposePersistence()` — the worker/handles
 * must be released before OPFS will let us delete the file.
 */
export const clearPersistenceStorage = async (): Promise<void> => {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return;
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry("better-form.sqlite", { recursive: false }).catch(() => {});
    // wa-sqlite may write a WAL sidecar file; remove it too if present
    await root.removeEntry("better-form.sqlite-journal", { recursive: false }).catch(() => {});
  } catch (err) {
    console.warn("[persistence] failed to clear OPFS storage", err);
  }
};
