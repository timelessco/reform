/**
 * Local-only form collection for unauthenticated drafts.
 *
 * Backed by IndexedDB (TanStack DB 1.0 `indexedDBCollectionOptions`) instead of
 * localStorage: drafts hold full Plate `content` trees, which regularly exceed the
 * ~5 MB localStorage budget and cost a synchronous JSON parse on every keystroke.
 *
 * IndexedDB opens asynchronously, so the collection is created lazily by
 * `initLocalFormCollection()` and read through `getLocalFormCollection()`. On the
 * server (no `indexedDB`) and before initialization the getter returns `null`;
 * callers disable their live query or skip the write instead of throwing.
 */
import { createCollection, createIndexedDB, indexedDBCollectionOptions } from "@tanstack/db";
import type { Collection, IndexedDBCollectionUtils, IndexedDBInstance } from "@tanstack/db";
import * as v from "valibot";
import { createFormHeaderNode } from "@/lib/form-schema/form-header-factory";
import { defaultFormSettings } from "@/types/form-settings";
import type { FormSettings } from "@/types/form-settings";

/** Parse Postgres timestamp (no TZ) as UTC before converting to ISO. */
const parseAsUTC = (val: string): string => {
  if (val.endsWith("Z") || /[+-]\d{2}(:\d{2})?$/.test(val)) return new Date(val).toISOString();

  return new Date(val.replace(" ", "T") + "Z").toISOString();
};

const timestampField = v.pipe(
  v.optional(v.string()),
  v.transform((val) => (val ? parseAsUTC(val) : new Date().toISOString())),
);

export const FormSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  createdByUserId: v.optional(v.string()),
  workspaceId: v.pipe(v.string(), v.uuid()),
  title: v.optional(v.string(), "Untitled"),
  formName: v.optional(v.string(), "draft"),
  schemaName: v.optional(v.string(), "draftFormSchema"),
  content: v.optional(v.array(v.any()), []),
  icon: v.nullish(v.string()),
  cover: v.nullish(v.string()),
  // Generated content thumbnail (Plate render → Blob). Set on publish.
  previewImageUrl: v.nullish(v.string()),
  status: v.optional(v.picklist(["draft", "published", "archived"]), "draft"),
  lastPublishedVersionId: v.nullish(v.string()),
  publishedContentHash: v.nullish(v.string()),
  draftSettings: v.optional(
    v.custom<FormSettings>(() => true),
    () => defaultFormSettings,
  ),
  // Live settings — no server row for local drafts; mirrors draft until sign-in + publish.
  liveSettings: v.optional(
    v.custom<FormSettings | null>(() => true),
    () => null,
  ),
  customization: v.optional(v.record(v.string(), v.any()), {}),
  createdAt: timestampField,
  updatedAt: timestampField,
});

export type Form = v.InferOutput<typeof FormSchema>;

export type LocalFormCollection = Collection<Form, string, IndexedDBCollectionUtils<Form, Form>>;

const DB_NAME = "reform-local";

const DB_VERSION = 1;

const STORE_NAME = "draft-forms";

const COLLECTION_ID = "draft-forms";

/** Pre-1.0 storage key holding drafts as `{ [key]: { versionKey, data } }`. */
export const LEGACY_STORAGE_KEY = "draft-form";

let instance: IndexedDBInstance | null = null;

let collection: LocalFormCollection | null = null;

let initPromise: Promise<LocalFormCollection> | null = null;

/** The initialized collection, or `null` before init and on the server. */
export const getLocalFormCollection = (): LocalFormCollection | null => collection;

/** IndexedDB is browser-only; SSR renders the draft editor without rows. */
export const isLocalFormStorageAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

/**
 * Read drafts written by the pre-IndexedDB localStorage adapter.
 * Returns `[]` when there is nothing to migrate or the payload is unreadable —
 * a corrupt legacy payload must never block the app from opening a fresh database.
 */
const readLegacyDrafts = (): Form[] => {
  if (typeof window === "undefined") return [];

  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage disabled (private mode / blocked cookies).
    return [];
  }

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];

    return Object.values(parsed as Record<string, unknown>).flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const candidate = (entry as { data?: unknown }).data;

      if (!candidate || typeof candidate !== "object") return [];

      const result = v.safeParse(FormSchema, candidate);

      return result.success ? [result.output] : [];
    });
  } catch {
    return [];
  }
};

/** Drop the legacy payload once its rows are safely in IndexedDB. */
const clearLegacyDrafts = () => {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to do — the next init retries the (idempotent) migration.
  }
};

/**
 * Move any pre-existing localStorage drafts into the IndexedDB store.
 * `importData` is atomic: a failure leaves previously stored rows untouched.
 */
const migrateLegacyDrafts = async (target: LocalFormCollection) => {
  const legacy = readLegacyDrafts();

  if (legacy.length === 0) {
    clearLegacyDrafts();

    return;
  }

  const existing = new Set((await target.toArrayWhenReady()).map((row) => row.id));
  const pending = legacy.filter((row) => !existing.has(row.id));

  if (pending.length > 0) await target.utils.importData(pending);

  clearLegacyDrafts();
};

/**
 * Open the database and create the collection. Idempotent: concurrent callers
 * share one promise, and a rejection clears it so a later call can retry
 * (e.g. after the user grants storage permission).
 */
export const initLocalFormCollection = (): Promise<LocalFormCollection> => {
  if (collection) return Promise.resolve(collection);

  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isLocalFormStorageAvailable()) {
      throw new Error("IndexedDB is not available in this environment");
    }

    instance = await createIndexedDB({
      name: DB_NAME,
      version: DB_VERSION,
      stores: [STORE_NAME],
    });

    const created = createCollection(
      indexedDBCollectionOptions({
        id: COLLECTION_ID,
        db: instance,
        name: STORE_NAME,
        schema: FormSchema,
        getKey: (item) => item.id,
      }),
    ) as LocalFormCollection;

    await created.preload();
    await migrateLegacyDrafts(created);

    collection = created;

    return created;
  })().catch((error: unknown) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
};

/** Close the connection and drop the singleton (tests, and `versionchange` recovery). */
export const resetLocalFormCollection = () => {
  instance?.close();
  instance = null;
  collection = null;
  initPromise = null;
};

export const DEFAULT_FORM_CONTENT = [
  createFormHeaderNode({ title: "Untitled", icon: null, cover: null }),
  {
    children: [{ text: "Start building your form..." }],
    type: "p",
  },
];
