import type { QueryClient } from "@tanstack/query-core";
import { createFavoriteCollection, createFormListingCollection } from "./query/form-listing";
import { createWorkspaceSummaryCollection } from "./query/workspace";
import type { createForm, updateForm } from "@/lib/server-fn/forms";
import { getPersistence } from "./_persistence";
import { state, stripNulls } from "./_state";
import type { ServerFnInput, ServerFns } from "./_state";

export const initCollections = async (queryClient: QueryClient, serverFns: ServerFns) => {
  // Collections are committed to state atomically at the end so
  // isInitialized() doesn't flip true mid-build — otherwise a live-query
  // hook could race and see a null singleton between `serverFns` being set
  // and the collection being built.
  const persistenceBundle = await getPersistence();
  const persistence = persistenceBundle?.persistence ?? null;

  const workspaces = createWorkspaceSummaryCollection({
    queryClient,
    queryFn: serverFns.getWorkspacesWithForms,
    persistence,
    onInsert: async ({ transaction }) => {
      const ws = transaction.mutations[0].modified;
      await serverFns.createWorkspace({
        id: ws.id,
        organizationId: ws.organizationId,
        name: ws.name,
      });
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      await serverFns.updateWorkspace({ id: m.original.id, ...m.changes });
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteWorkspace({ id: transaction.mutations[0].original.id });
    },
  });

  const formListings = createFormListingCollection({
    queryClient,
    queryFn: serverFns.getFormListings,
    persistence,
    onInsert: async ({ transaction }) => {
      const modified = transaction.mutations[0].modified;
      await serverFns.createForm(stripNulls(modified) as ServerFnInput<typeof createForm>);
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      await serverFns.updateForm(
        stripNulls({
          id: m.original.id,
          ...m.changes,
        }) as ServerFnInput<typeof updateForm>,
      );
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteForm({ id: transaction.mutations[0].original.id });
    },
  });

  const favorites = createFavoriteCollection({
    queryClient,
    queryFn: serverFns.getFavorites,
    persistence,
    onInsert: async ({ transaction }) => {
      await serverFns.addFavorite({ formId: transaction.mutations[0].modified.formId });
    },
    onDelete: async ({ transaction }) => {
      await serverFns.removeFavorite({ formId: transaction.mutations[0].original.formId });
    },
  });

  state.workspaces = workspaces;
  state.formListings = formListings;
  state.favorites = favorites;
  state.queryClient = queryClient;
  state.serverFns = serverFns;
};
