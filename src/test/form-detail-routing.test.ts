import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/query-core";
import { eq } from "drizzle-orm";
import {
  createFormDetailCollection,
  resolveFormRoute,
} from "@/db-collections/form-detail-query.collection";
import type { FormDetail } from "@/db-collections/form-detail-query.collection";
import { db } from "@/lib/db";
import { forms } from "@/db/schema";
import {
  getTestUtils,
  createTestOrg,
  createTestMember,
  createTestWorkspace,
  createTestForm,
  cleanupTestUser,
  cleanupTestOrg,
} from "@/test/helpers";

/** Fetch form detail directly from DB (bypasses auth middleware) */
const fetchFormDetail = async (formId: string): Promise<FormDetail | null> => {
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) return null;
  return {
    id: form.id,
    title: form.title,
    status: form.status,
    workspaceId: form.workspaceId,
    content: form.content as unknown[],
    settings: form.settings as Record<string, unknown>,
    customization: (form.customization ?? {}) as Record<string, unknown>,
    formName: form.formName,
    schemaName: form.schemaName,
    icon: form.icon,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    createdByUserId: form.createdByUserId,
  };
};

describe("form detail collection", () => {
  const ownerId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  let orgId: string;
  let formId: string;
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const t = await getTestUtils();
    await t.saveUser(
      t.createUser({ id: ownerId, email: `owner-fd-${ownerId}@example.com`, name: "Owner" }),
    );
    await t.saveUser(
      t.createUser({ id: memberId, email: `member-fd-${memberId}@example.com`, name: "Member" }),
    );

    const org = await createTestOrg(ownerId);
    orgId = org.id as string;
    await createTestMember(memberId, orgId);

    const workspace = await createTestWorkspace(orgId, ownerId);
    const form = await createTestForm(workspace.id, ownerId);
    formId = form.id;
  });

  afterEach(async () => {
    queryClient.clear();
    await cleanupTestUser(memberId);
    await cleanupTestUser(ownerId);
    await cleanupTestOrg(orgId);
  });

  it("loads full form detail with content", async () => {
    const collection = createFormDetailCollection({
      queryClient,
      formId,
      queryFn: () => fetchFormDetail(formId),
    });

    const state = await collection.stateWhenReady();
    const form = state.get(formId);

    expect(form).toBeDefined();
    expect(form).toMatchObject({
      id: formId,
      status: "draft",
      content: expect.any(Object),
    });
  });

  it("returns empty collection for nonexistent form", async () => {
    const collection = createFormDetailCollection({
      queryClient,
      formId: "00000000-0000-0000-0000-000000000000",
      queryFn: () => fetchFormDetail("00000000-0000-0000-0000-000000000000"),
    });

    const state = await collection.stateWhenReady();
    expect(state.size).toBe(0);
  });

  it("optimistic update modifies form detail", async () => {
    const collection = createFormDetailCollection({
      queryClient,
      formId,
      queryFn: () => fetchFormDetail(formId),
      onUpdate: async () => ({ refetch: false }),
    });

    await collection.stateWhenReady();

    collection.update(formId, (draft: FormDetail) => {
      draft.title = "Updated Detail Title";
      draft.status = "published";
    });

    const form = collection.get(formId);
    expect(form).toMatchObject({
      title: "Updated Detail Title",
      status: "published",
    });
  });
});

describe("resolveFormRoute", () => {
  it("routes draft to editor", () => {
    expect(resolveFormRoute("draft")).toBe("editor");
  });

  it("routes published to submissions", () => {
    expect(resolveFormRoute("published")).toBe("submissions");
  });

  it("routes archived to archived", () => {
    expect(resolveFormRoute("archived")).toBe("archived");
  });

  it("routes undefined to not-found", () => {
    expect(resolveFormRoute(undefined)).toBe("not-found");
  });
});
