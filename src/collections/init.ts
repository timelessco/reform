import type { QueryClient } from "@tanstack/query-core";
import { createFavoriteCollection, createFormListingCollection } from "./query/form-listing";
import { createWorkspaceSummaryCollection } from "./query/workspace";
import type { createForm, updateForm } from "@/lib/server-fn/forms";
import { state, stripNulls } from "./_state";
import type { ServerFnInput, ServerFns } from "./_state";

export const initCollections = (queryClient: QueryClient, serverFns: ServerFns) => {
  state.queryClient = queryClient;
  state.serverFns = serverFns;

  state.workspaces = createWorkspaceSummaryCollection({
    queryClient,
    queryFn: serverFns.getWorkspacesWithForms,
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
      const changes = m.changes as Record<string, unknown>;
      // sortIndex is per-user, routed to dedicated endpoint; other fields go to updateWorkspace
      const { sortIndex, ...rest } = changes;
      const pending: Promise<unknown>[] = [];
      if (typeof sortIndex === "string") {
        pending.push(
          serverFns.reorderWorkspace({
            workspaceId: m.original.id,
            sortIndex,
          }),
        );
      }
      if (Object.keys(rest).length > 0) {
        pending.push(serverFns.updateWorkspace({ id: m.original.id, ...rest }));
      }
      await Promise.all(pending);
    },
    onDelete: async ({ transaction }) => {
      await serverFns.deleteWorkspace({ id: transaction.mutations[0].original.id });
    },
  });

  state.formListings = createFormListingCollection({
    queryClient,
    queryFn: serverFns.getFormListings,
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

  state.favorites = createFavoriteCollection({
    queryClient,
    queryFn: serverFns.getFavorites,
    onInsert: async ({ transaction }) => {
      const modified = transaction.mutations[0].modified;
      await serverFns.addFavorite({
        formId: modified.formId,
        sortIndex: modified.sortIndex ?? undefined,
      });
    },
    onUpdate: async ({ transaction }) => {
      const m = transaction.mutations[0];
      const changes = m.changes as Record<string, unknown>;
      if (typeof changes.sortIndex === "string") {
        await serverFns.reorderFavorite({
          formId: m.original.formId,
          sortIndex: changes.sortIndex,
        });
      }
    },
    onDelete: async ({ transaction }) => {
      await serverFns.removeFavorite({ formId: transaction.mutations[0].original.formId });
    },
  });
};
