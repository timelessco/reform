/**
 * IndexedDB-backed offline draft store.
 *
 * `fake-indexeddb` stands in for the browser's IDB: each test gets a fresh
 * `IDBFactory` so an earlier test's database cannot leak into the next one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v from "valibot";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import {
  FormSchema,
  getLocalFormCollection,
  initLocalFormCollection,
  isLocalFormStorageAvailable,
  LEGACY_STORAGE_KEY,
  resetLocalFormCollection,
} from "@/collections/local/form";
import { defaultFormSettings } from "@/types/form-settings";

const draft = (overrides: Record<string, unknown> = {}) => ({
  id: "0f7b0a2c-1d4e-4f80-9a2b-3c4d5e6f7a8b",
  workspaceId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  title: "Draft Form",
  formName: "draft",
  schemaName: "draftFormSchema",
  status: "draft" as const,
  content: [{ type: "p", children: [{ text: "hello" }] }],
  draftSettings: { ...defaultFormSettings },
  liveSettings: null,
  customization: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

type StorageShim = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

let idbFactory: IDBFactory;

let storage: StorageShim;

let values: Map<string, string>;

/** Install the browser globals the collection reads at init time. */
const installBrowserGlobals = () => {
  idbFactory = new IDBFactory();
  values = new Map();

  storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
  };

  vi.stubGlobal("window", { indexedDB: idbFactory, localStorage: storage });
  vi.stubGlobal("indexedDB", idbFactory);
  vi.stubGlobal("IDBKeyRange", IDBKeyRange);
};

/** Seed the pre-1.0 localStorage payload, in the shape the old adapter wrote. */
const seedLegacyDrafts = (rows: unknown[]) => {
  values.set(
    LEGACY_STORAGE_KEY,
    JSON.stringify(
      Object.fromEntries(
        rows.map((row) => [
          (row as { id: string }).id,
          { versionKey: JSON.stringify(row), data: row },
        ]),
      ),
    ),
  );
};

beforeEach(() => {
  installBrowserGlobals();
  resetLocalFormCollection();
});

afterEach(() => {
  resetLocalFormCollection();
  vi.unstubAllGlobals();
});

describe("local draft collection (IndexedDB)", () => {
  it("stores a draft and reads it back after a reload", async () => {
    const collection = await initLocalFormCollection();
    const form = draft();

    await collection.insert(form).when("settled");

    expect(getLocalFormCollection()).toBe(collection);
    expect(await collection.toArrayWhenReady()).toHaveLength(1);

    // A reload drops the singleton but keeps the database.
    resetLocalFormCollection();
    const reopened = await initLocalFormCollection();
    const rows = await reopened.toArrayWhenReady();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: form.id, title: "Draft Form" });
  });

  it("validates rows through the schema on write", async () => {
    const collection = await initLocalFormCollection();

    // DB validates against the schema before the mutation is queued.
    expect(() => collection.insert(draft({ id: "not-a-uuid" }))).toThrow(/validation/i);

    expect(await collection.toArrayWhenReady()).toHaveLength(0);
  });

  it("migrates pre-existing localStorage drafts and clears the legacy key", async () => {
    const legacy = draft({ title: "From localStorage" });
    seedLegacyDrafts([legacy]);

    const collection = await initLocalFormCollection();
    const rows = await collection.toArrayWhenReady();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: legacy.id, title: "From localStorage" });
    expect(values.has(LEGACY_STORAGE_KEY)).toBe(false);

    // Reopening does not re-import anything.
    resetLocalFormCollection();
    const reopened = await initLocalFormCollection();
    expect(await reopened.toArrayWhenReady()).toHaveLength(1);
  });

  it("opens a usable store when the legacy payload is corrupt", async () => {
    values.set(LEGACY_STORAGE_KEY, "{ this is not json");

    const collection = await initLocalFormCollection();

    expect(await collection.toArrayWhenReady()).toHaveLength(0);
    // The unreadable payload is dropped so later inits are cheap.
    expect(values.has(LEGACY_STORAGE_KEY)).toBe(false);

    await collection.insert(draft()).when("settled");
    expect(await collection.toArrayWhenReady()).toHaveLength(1);
  });

  it("skips legacy rows whose id already exists in IndexedDB", async () => {
    const existing = draft({ title: "Already in IndexedDB" });

    const incoming = draft({
      id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
      title: "New from localStorage",
    });

    // First run writes one row and migrates the other.
    seedLegacyDrafts([incoming]);
    const first = await initLocalFormCollection();
    await first.insert(existing).when("settled");
    await first.toArrayWhenReady();
    resetLocalFormCollection();

    // A legacy payload that still lists the already-stored id (interrupted migration)
    // must not duplicate or overwrite it.
    seedLegacyDrafts([existing]);
    const reopened = await initLocalFormCollection();
    const rows = await reopened.toArrayWhenReady();

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === existing.id)?.title).toBe("Already in IndexedDB");
    expect(values.has(LEGACY_STORAGE_KEY)).toBe(false);
  });

  it("shares one init promise across concurrent callers", async () => {
    const [a, b] = await Promise.all([initLocalFormCollection(), initLocalFormCollection()]);

    expect(a).toBe(b);
  });

  it("reports no collection before init and no storage without IndexedDB", async () => {
    expect(getLocalFormCollection()).toBeNull();

    vi.unstubAllGlobals();

    expect(isLocalFormStorageAvailable()).toBe(false);
    await expect(initLocalFormCollection()).rejects.toThrow(/IndexedDB is not available/);
  });

  it("retries after a failed open instead of caching the rejection", async () => {
    vi.stubGlobal("window", { indexedDB: undefined, localStorage: storage });

    await expect(initLocalFormCollection()).rejects.toThrow(/IndexedDB is not available/);

    // Storage becomes available (e.g. the user leaves private mode).
    vi.stubGlobal("window", { indexedDB: idbFactory, localStorage: storage });
    const collection = await initLocalFormCollection();

    expect(getLocalFormCollection()).toBe(collection);
  });

  it("keeps valid drafts when the legacy payload mixes valid and invalid rows", async () => {
    seedLegacyDrafts([
      draft({ title: "Valid" }),
      { id: "nope", workspaceId: "also-nope", title: "Invalid" },
    ]);

    const collection = await initLocalFormCollection();
    const rows = await collection.toArrayWhenReady();

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Valid");
  });
});

describe("FormSchema", () => {
  it("fills defaults for a minimal draft", () => {
    const parsed = v.parse(FormSchema, {
      id: "0f7b0a2c-1d4e-4f80-9a2b-3c4d5e6f7a8b",
      workspaceId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    });

    expect(parsed.title).toBe("Untitled");
    expect(parsed.status).toBe("draft");
    expect(parsed.content).toEqual([]);
  });
});
