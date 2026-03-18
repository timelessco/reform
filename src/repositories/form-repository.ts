import { createTransaction } from "@tanstack/react-db";
import {
  formCollection,
  type Form,
  type FormBuilderSettings,
} from "@/db-collections/form.collections";
import { formVersionCollection } from "@/db-collections/form-version.collection";
import { createForm } from "@/lib/fn/forms";
import {
  discardFormChanges,
  publishFormVersion,
  restoreFormVersion,
} from "@/lib/fn/form-versions";
import { logger } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Handle returned by transactional domain actions.
 *
 * - `result`    — synchronously available data produced by the optimistic
 *                 mutation (e.g. the duplicated Form).
 * - `confirmed` — resolves once the server has accepted the transaction.
 *                 Rejects if the server call fails (auto-rollback happens).
 */
export interface TransactionHandle<T = void> {
  result: T;
  confirmed: Promise<void>;
}

export interface FormHeaderFields {
  title?: string;
  icon?: string;
  iconColor?: string;
  cover?: string;
}

/**
 * Abstraction over the form persistence layer.
 *
 * Every method delegates to the **existing** `formCollection`, server
 * functions, and `createTransaction` — the same code-paths that hooks and
 * components already use.  The repository is purely additive: no existing
 * callers are changed.
 */
export interface FormRepository {
  // ── Domain actions (transactional, optimistic) ──────────────────────

  /** Publish the current draft as a new version. */
  publish(formId: string): TransactionHandle;

  /** Duplicate a form and return the new Form. */
  duplicate(formId: string): TransactionHandle<Form>;

  /** Archive (soft-delete) a form. */
  archive(formId: string): TransactionHandle;

  /** Restore an archived form back to draft status. */
  restore(formId: string): TransactionHandle;

  /** Revert to the last published version, discarding draft changes. */
  discardChanges(formId: string): TransactionHandle;

  /** Restore a specific version's content onto the draft. */
  restoreVersion(
    formId: string,
    versionId: string,
  ): TransactionHandle;

  // ── Simple updates (via collection.update, fire-and-forget) ─────────

  /** Update header-level fields (title, icon, cover). */
  updateHeader(
    id: string,
    header: FormHeaderFields & {
      workspaceId?: string;
      createdAt?: string;
      updatedAt?: string;
    },
  ): void;

  /** Merge partial settings into the form's settings object. */
  updateSettings(id: string, settings: Partial<FormBuilderSettings>): void;

  /** Apply an arbitrary updater function to the form draft. */
  updateDoc(id: string, updater: (draft: any) => void): void;

  /** Update the form status field. */
  updateStatus(
    id: string,
    status: "draft" | "published" | "archived",
  ): void;
}

// ---------------------------------------------------------------------------
// Dependencies — injectable for testing
// ---------------------------------------------------------------------------

export interface FormRepositoryDeps {
  collection: typeof formCollection;
  versionCollection: typeof formVersionCollection;
  serverFns: {
    createForm: typeof createForm;
    publishFormVersion: typeof publishFormVersion;
    restoreFormVersion: typeof restoreFormVersion;
    discardFormChanges: typeof discardFormChanges;
  };
}

const defaultDeps: FormRepositoryDeps = {
  collection: formCollection,
  versionCollection: formVersionCollection,
  serverFns: {
    createForm,
    publishFormVersion,
    restoreFormVersion,
    discardFormChanges,
  },
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a `FormRepository` instance.
 *
 * By default it uses the real `formCollection` and server functions.
 * Pass `deps` to inject stubs/mocks for testing.
 */
export function createFormRepository(
  deps: Partial<FormRepositoryDeps> = {},
): FormRepository {
  const {
    collection: col,
    versionCollection: verCol,
    serverFns: fns,
  } = { ...defaultDeps, ...deps };

  // Helper: wrap a createTransaction call into a TransactionHandle
  function txHandle<T = void>(
    mutationFn: () => Promise<void>,
    mutateFn: () => T,
  ): TransactionHandle<T> {
    const tx = createTransaction({ mutationFn });

    let result!: T;
    tx.mutate(() => {
      result = mutateFn();
    });

    // tx.isPersisted is a Deferred<Transaction> that resolves once the
    // server has accepted the transaction (or rejects on failure/rollback).
    const confirmed = tx.isPersisted.promise.then(() => undefined);

    return { result, confirmed };
  }

  return {
    // ── Domain actions ──────────────────────────────────────────────

    publish(formId) {
      return txHandle(
        () => fns.publishFormVersion({ data: { formId } }).then(() => undefined),
        () => {
          col.update(formId, (draft) => {
            draft.status = "published";
            draft.updatedAt = new Date().toISOString();
          });
        },
      );
    },

    duplicate(formId) {
      const sourceForm = col.state.get(formId);
      if (!sourceForm) {
        throw new Error(`Form not found: ${formId}`);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const title = sourceForm.title
        ? `${sourceForm.title} copy`
        : "Untitled copy";

      const newForm: Form = {
        ...sourceForm,
        id,
        title,
        content: structuredClone(sourceForm.content),
        settings: structuredClone(sourceForm.settings),
        status: "draft",
        lastPublishedVersionId: null,
        publishedContentHash: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      return txHandle(
        () => fns.createForm({ data: newForm }).then(() => undefined),
        () => {
          col.insert(newForm);
          return newForm;
        },
      );
    },

    archive(formId) {
      return txHandle(
        // Archive uses the collection's own onUpdate to call the server,
        // so we don't need a separate server call in mutationFn.
        // However, to keep the pattern consistent and explicit, we use
        // an empty mutationFn — the collection's onUpdate won't fire
        // because the mutation is owned by the transaction.
        async () => {
          // The server sync happens via Electric after the optimistic
          // update is confirmed. For archive, we rely on the collection's
          // onUpdate callback which sends the changes to the server.
          // Since tx-owned mutations skip onUpdate, we call updateForm
          // directly.
          const { updateForm } = await import("@/lib/fn/forms");
          await updateForm({
            data: {
              id: formId,
              status: "archived" as const,
              updatedAt: new Date().toISOString(),
            },
          });
        },
        () => {
          col.update(formId, (draft) => {
            draft.status = "archived";
            draft.deletedAt = new Date().toISOString();
            draft.updatedAt = new Date().toISOString();
          });
        },
      );
    },

    restore(formId) {
      return txHandle(
        async () => {
          const { updateForm } = await import("@/lib/fn/forms");
          await updateForm({
            data: {
              id: formId,
              status: "draft" as const,
              updatedAt: new Date().toISOString(),
            },
          });
        },
        () => {
          col.update(formId, (draft) => {
            draft.status = "draft";
            draft.deletedAt = null;
            draft.updatedAt = new Date().toISOString();
          });
        },
      );
    },

    discardChanges(formId) {
      const form = col.state.get(formId);
      if (!form?.lastPublishedVersionId) {
        throw new Error("No published version to revert to");
      }

      const version = verCol.state.get(form.lastPublishedVersionId);
      if (!version) {
        throw new Error("Published version not found in local state");
      }

      return txHandle(
        () => fns.discardFormChanges({ data: { formId } }).then(() => undefined),
        () => {
          col.update(formId, (draft) => {
            draft.content = version.content;
            draft.title = version.title;
            draft.customization = version.customization ?? {};
            draft.updatedAt = new Date().toISOString();
          });
        },
      );
    },

    restoreVersion(formId, versionId) {
      const version = verCol.state.get(versionId);
      if (!version) {
        throw new Error("Version not found in local state");
      }

      return txHandle(
        () =>
          fns
            .restoreFormVersion({ data: { formId, versionId } })
            .then(() => undefined),
        () => {
          col.update(formId, (draft) => {
            draft.content = version.content;
            draft.title = version.title;
            draft.customization = version.customization ?? {};
            draft.updatedAt = new Date().toISOString();
          });
        },
      );
    },

    // ── Simple updates ──────────────────────────────────────────────

    updateHeader(id, header) {
      col.update(id, (draft) => {
        if (header.title !== undefined) draft.title = header.title;
        if (header.icon !== undefined) draft.icon = header.icon;
        if (header.cover !== undefined) draft.cover = header.cover;
        if (header.workspaceId !== undefined)
          draft.workspaceId = header.workspaceId;
        if (header.createdAt !== undefined)
          draft.createdAt = header.createdAt;
        if (header.updatedAt !== undefined)
          draft.updatedAt = header.updatedAt;
      });
    },

    updateSettings(id, settings) {
      col.update(id, (draft) => {
        logger("FormRepository.updateSettings", id, Object.keys(settings));
        draft.settings = { ...draft.settings, ...settings };
        draft.updatedAt = new Date().toISOString();
      });
    },

    updateDoc(id, updater) {
      col.update(id, (draft) => {
        logger("FormRepository.updateDoc", id);
        updater(draft);
        draft.updatedAt = new Date().toISOString();
      });
    },

    updateStatus(id, status) {
      col.update(id, (draft) => {
        draft.status = status;
        draft.updatedAt = new Date().toISOString();
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Default singleton — import this for production use
// ---------------------------------------------------------------------------

export const formRepository = createFormRepository();
