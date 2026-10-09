// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initCollections } from "@/collections/init";
import { state } from "@/collections/_state";
import type { ServerFns } from "@/collections/_state";
import type { FormListing } from "@/collections/query/form-listing";
import { useFormMeta, useFormShareMeta } from "@/hooks/use-live-hooks";

const formId = "a6377d17-e304-43a0-911d-cbd069b45634";

const originalContent = [{ type: "p", children: [{ text: "Original" }] }];

const editedContent = [{ type: "p", children: [{ text: "Edited" }] }];

let rows: FormListing[];

let queryClient: QueryClient;

let liveQueries: Array<{ cleanup: () => Promise<void> }> = [];

const getCollection = () => {
  if (!state.formListings) throw new Error("Test collection was not initialized");

  return state.formListings;
};

const getFormListings = vi.fn<ServerFns["getFormListings"]>();

const updateForm = vi.fn<ServerFns["updateForm"]>();

const unused = () => Promise.reject(new Error("Unexpected server call"));

beforeEach(async () => {
  liveQueries = [];
  rows = [
    {
      id: formId,
      shortId: "short",
      title: "Form",
      status: "draft",
      updatedAt: "2026-01-01T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
      workspaceId: "workspace",
      icon: null,
      formName: "form",
      submissionCount: 0,
      content: originalContent,
    },
  ];
  getFormListings.mockReset().mockImplementation(async () => rows);
  updateForm.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  initCollections(queryClient, {
    getFormListings,
    updateForm,
    getWorkspacesWithForms: async () => ({ workspaces: [] }),
    getFavorites: async () => [],
    getFormDetail: unused,
    getVersionList: unused,
    getVersionContent: unused,
    getSubmissionsCount: unused,
    createWorkspace: unused,
    updateWorkspace: unused,
    deleteWorkspace: unused,
    createForm: unused,
    deleteForm: unused,
    bulkArchiveForms: unused,
    bulkDeleteForms: unused,
    addFavorite: unused,
    removeFavorite: unused,
    reorderFavorite: unused,
    reorderWorkspace: unused,
  });
  await state.formListings?.preload();
});

afterEach(async () => {
  cleanup();
  await Promise.all(liveQueries.map((query) => query.cleanup()));
  await Promise.all([
    state.formListings?.cleanup(),
    state.workspaces?.cleanup(),
    state.favorites?.cleanup(),
  ]);
  queryClient.clear();
  state.serverFns = null;
  state.queryClient = null;
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("editor save subscriptions", () => {
  it("keeps persisted body edits without refetching or changing metadata subscribers", async () => {
    const { result } = renderHook(
      () => ({ header: useFormMeta(formId), share: useFormShareMeta(formId) }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.header.data?.[0]?.title).toBe("Form"));
    const header = result.current.header.data;
    const share = result.current.share.data;

    if (result.current.header.collection) liveQueries.push(result.current.header.collection);

    if (result.current.share.collection) liveQueries.push(result.current.share.collection);
    const requests = getFormListings.mock.calls.length;
    const collection = getCollection();

    await act(async () => {
      const tx = collection.update(formId, (draft) => {
        draft.content = editedContent;
      });

      await tx.isPersisted.promise;
    });

    expect(updateForm).toHaveBeenCalledWith({ id: formId, content: editedContent });
    expect(getFormListings).toHaveBeenCalledTimes(requests);
    expect(collection.get(formId)?.content).toEqual(editedContent);
    expect(collection.get(formId)?.updatedAt).toBe("2026-01-01T00:00:00Z");
    expect(result.current.header.data).toBe(header);
    expect(result.current.share.data).toBe(share);

    rows = rows.map((row) => ({
      ...row,
      content: editedContent,
      updatedAt: "2026-02-01T00:00:00Z",
    }));
    await act(async () => {
      await collection.utils.refetch();
    });
    expect(collection.get(formId)?.updatedAt).toBe("2026-02-01T00:00:00Z");
    expect(collection.get(formId)?.content).toEqual(editedContent);
  });

  it("rolls back a failed body save", async () => {
    updateForm.mockRejectedValueOnce(new Error("Save failed"));
    const collection = getCollection();

    const tx = collection.update(formId, (draft) => {
      draft.content = editedContent;
    });

    await expect(tx.isPersisted.promise).rejects.toThrow("Save failed");
    expect(collection.get(formId)?.content).toEqual(originalContent);
  });

  it("refetches metadata changes and updates header and share subscribers", async () => {
    const { result } = renderHook(
      () => ({ header: useFormMeta(formId), share: useFormShareMeta(formId) }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.header.data?.[0]?.title).toBe("Form"));

    if (result.current.header.collection) liveQueries.push(result.current.header.collection);

    if (result.current.share.collection) liveQueries.push(result.current.share.collection);
    const requests = getFormListings.mock.calls.length;
    rows = rows.map((row) => ({ ...row, title: "Renamed", content: editedContent }));
    const collection = getCollection();

    await act(async () => {
      const tx = collection.update(formId, (draft) => {
        draft.content = editedContent;
        draft.title = "Renamed";
      });

      await tx.isPersisted.promise;
    });

    expect(getFormListings.mock.calls.length).toBeGreaterThan(requests);
    await waitFor(() => expect(result.current.header.data?.[0]?.title).toBe("Renamed"));
    expect(result.current.share.data?.[0]?.title).toBe("Renamed");
  });
});
