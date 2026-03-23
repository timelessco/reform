import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  formVersionsQueryKey,
  formVersionContentQueryKey,
  getFormVersionsQueryOptions,
  getFormVersionContentQueryOptions,
} from "@/lib/form-versions-query";
import type { FormVersionMetadata, FormVersionContent } from "@/lib/form-versions-query";

describe("formVersionsQueryKey", () => {
  it("generates unique query key for each formId", () => {
    const key1 = formVersionsQueryKey("form-1");
    const key2 = formVersionsQueryKey("form-2");

    expect(key1).toStrictEqual(["form-versions", "form-1"]);
    expect(key2).toStrictEqual(["form-versions", "form-2"]);
    expect(key1).not.toStrictEqual(key2);
  });
});

describe("formVersionContentQueryKey", () => {
  it("generates unique query key for each versionId", () => {
    const key1 = formVersionContentQueryKey("version-1");
    const key2 = formVersionContentQueryKey("version-2");

    expect(key1).toStrictEqual(["form-version-content", "version-1"]);
    expect(key2).toStrictEqual(["form-version-content", "version-2"]);
    expect(key1).not.toStrictEqual(key2);
  });
});

describe("getFormVersionsQueryOptions", () => {
  it("creates query options with correct query key", () => {
    const options = getFormVersionsQueryOptions("form-1");

    expect(options.queryKey).toStrictEqual(["form-versions", "form-1"]);
  });

  it("configures stale time to 5 minutes", () => {
    const options = getFormVersionsQueryOptions("form-1");

    expect(options.staleTime).toBe(1000 * 60 * 5);
  });

  it("can be used to set and get data in QueryClient", () => {
    const queryClient = new QueryClient();
    const versions: FormVersionMetadata[] = [
      {
        id: "v1",
        version: 2,
        title: "Version 2",
        publishedAt: "2024-01-02T00:00:00.000Z",
        publishedBy: { id: "user-1", name: "John", image: null },
      },
      {
        id: "v2",
        version: 1,
        title: "Version 1",
        publishedAt: "2024-01-01T00:00:00.000Z",
        publishedBy: { id: "user-1", name: "John", image: null },
      },
    ];

    queryClient.setQueryData(["form-versions", "form-1"], versions);

    const data = queryClient.getQueryData<FormVersionMetadata[]>(["form-versions", "form-1"]);
    expect(data).toStrictEqual(versions);
  });
});

describe("getFormVersionContentQueryOptions", () => {
  it("creates query options with correct query key", () => {
    const options = getFormVersionContentQueryOptions("version-1");

    expect(options.queryKey).toStrictEqual(["form-version-content", "version-1"]);
  });

  it("configures stale time to 5 minutes", () => {
    const options = getFormVersionContentQueryOptions("version-1");

    expect(options.staleTime).toBe(1000 * 60 * 5);
  });

  it("can be used to set and get data in QueryClient", () => {
    const queryClient = new QueryClient();
    const content: FormVersionContent = {
      id: "version-1",
      formId: "form-1",
      version: 1,
      title: "Version 1",
      content: [{ type: "p", children: [{ text: "Hello" }] }],
      settings: {},
      customization: {},
      publishedAt: "2024-01-01T00:00:00.000Z",
      publishedByUserId: "user-1",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    queryClient.setQueryData(["form-version-content", "version-1"], content);

    const data = queryClient.getQueryData<FormVersionContent>([
      "form-version-content",
      "version-1",
    ]);
    expect(data).toStrictEqual(content);
  });
});

describe("query data flow for version list metadata", () => {
  it("allows optimistic update of version list after publish", () => {
    const queryClient = new QueryClient();
    const existingVersions: FormVersionMetadata[] = [
      {
        id: "v1",
        version: 1,
        title: "Version 1",
        publishedAt: "2024-01-01T00:00:00.000Z",
        publishedBy: { id: "user-1", name: "John", image: null },
        publishedByUserId: "user-1",
      },
    ];

    queryClient.setQueryData(["form-versions", "form-1"], existingVersions);

    const newVersion: FormVersionMetadata = {
      id: "v2",
      version: 2,
      title: "Version 2",
      publishedAt: "2024-01-02T00:00:00.000Z",
      publishedBy: { id: "user-1", name: "John", image: null },
      publishedByUserId: "user-1",
    };

    const currentVersions = queryClient.getQueryData<FormVersionMetadata[]>([
      "form-versions",
      "form-1",
    ]) as FormVersionMetadata[];
    const combinedVersions: FormVersionMetadata[] = [newVersion, ...currentVersions];
    queryClient.setQueryData(["form-versions", "form-1"], combinedVersions);

    const updatedData = queryClient.getQueryData<FormVersionMetadata[]>([
      "form-versions",
      "form-1",
    ]);
    expect(updatedData).toHaveLength(2);
    expect(updatedData?.[0].id).toBe("v2");
  });

  it("allows rollback of version list on publish failure", () => {
    const queryClient = new QueryClient();
    const originalVersions: FormVersionMetadata[] = [
      {
        id: "v1",
        version: 1,
        title: "Version 1",
        publishedAt: "2024-01-01T00:00:00.000Z",
        publishedBy: { id: "user-1", name: "John", image: null },
        publishedByUserId: "user-1",
      },
    ];

    queryClient.setQueryData(["form-versions", "form-1"], originalVersions);

    const newVersion: FormVersionMetadata = {
      id: "v2",
      version: 2,
      title: "Version 2",
      publishedAt: "2024-01-02T00:00:00.000Z",
      publishedBy: { id: "user-1", name: "John", image: null },
      publishedByUserId: "user-1",
    };

    queryClient.setQueryData(["form-versions", "form-1"], [newVersion, ...originalVersions]);

    const versions = queryClient.getQueryData<FormVersionMetadata[]>(["form-versions", "form-1"]);
    expect(versions).toHaveLength(2);

    queryClient.setQueryData(["form-versions", "form-1"], originalVersions);

    const rolledBack = queryClient.getQueryData<FormVersionMetadata[]>(["form-versions", "form-1"]);
    expect(rolledBack).toStrictEqual(originalVersions);
  });
});

describe("query data flow for on-demand content retrieval", () => {
  it("allows setting version content on-demand after selection", () => {
    const queryClient = new QueryClient();

    const versionContent: FormVersionContent = {
      id: "v1",
      formId: "form-1",
      version: 1,
      title: "Version 1",
      content: [{ type: "p", children: [{ text: "Hello World" }] }],
      settings: { theme: "light" },
      customization: { accentColor: "#000" },
      publishedAt: "2024-01-01T00:00:00.000Z",
      publishedByUserId: "user-1",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    queryClient.setQueryData(["form-version-content", "v1"], versionContent);

    const data = queryClient.getQueryData<FormVersionContent>(["form-version-content", "v1"]);
    expect(data?.content).toStrictEqual([{ type: "p", children: [{ text: "Hello World" }] }]);
    expect(data?.title).toBe("Version 1");
  });

  it("allows clearing version content when exiting version view", () => {
    const queryClient = new QueryClient();

    const versionContent: FormVersionContent = {
      id: "v1",
      formId: "form-1",
      version: 1,
      title: "Version 1",
      content: [],
      settings: {},
      customization: {},
      publishedAt: "2024-01-01T00:00:00.000Z",
      publishedByUserId: "user-1",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    queryClient.setQueryData(["form-version-content", "v1"], versionContent);

    queryClient.removeQueries({
      queryKey: ["form-version-content", "v1"],
    });

    const data = queryClient.getQueryData<FormVersionContent>(["form-version-content", "v1"]);
    expect(data).toBeUndefined();
  });
});
