import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/query-core";
import { eq } from "drizzle-orm";
import { createFormDetailCollection } from "@/db-collections/form-detail-query.collection";
import type { FormDetail } from "@/db-collections/form-detail-query.collection";
import { db } from "@/lib/db";
import { forms } from "@/db/schema";
import {
  getTestUtils,
  createTestOrg,
  createTestWorkspace,
  createTestForm,
  cleanupTestUser,
  cleanupTestOrg,
} from "@/test/helpers";

const fetchFormDetail = async (formId: string): Promise<FormDetail | null> => {
  const [f] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!f) return null;
  return {
    id: f.id,
    title: f.title,
    status: f.status,
    workspaceId: f.workspaceId,
    content: f.content as any,
    settings: f.settings as any,
    customization: (f.customization ?? {}) as any,
    formName: f.formName,
    schemaName: f.schemaName,
    icon: f.icon,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    createdByUserId: f.createdByUserId,
  };
};

describe("local draft sync without Electric txids", () => {
  const ownerId = crypto.randomUUID();
  let orgId: string;
  let formId: string;
  let workspaceId: string;
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const t = await getTestUtils();
    await t.saveUser(
      t.createUser({ id: ownerId, email: `owner-ds-${ownerId}@example.com`, name: "Owner" }),
    );
    const org = await createTestOrg(ownerId);
    orgId = org.id as string;
    const ws = await createTestWorkspace(orgId, ownerId);
    workspaceId = ws.id;
    const form = await createTestForm(workspaceId, ownerId);
    formId = form.id;
  });

  afterEach(async () => {
    queryClient.clear();
    await cleanupTestUser(ownerId);
    await cleanupTestOrg(orgId);
  });

  it("refetch-based confirmation: form exists after server write", async () => {
    // Simulate: local draft was synced to server (form already in DB)
    // Refetch the collection to confirm it landed
    const collection = createFormDetailCollection({
      queryClient,
      formId,
      queryFn: () => fetchFormDetail(formId),
    });

    const state = await collection.stateWhenReady();
    const confirmed = state.get(formId);

    // Confirmation: form exists in refetched state
    expect(confirmed).toBeDefined();
    expect(confirmed).toMatchObject({ id: formId });
  });

  it("refetch returns empty when server write failed (form not in DB)", async () => {
    const missingId = "00000000-0000-0000-0000-000000000000";
    const collection = createFormDetailCollection({
      queryClient,
      formId: missingId,
      queryFn: () => fetchFormDetail(missingId),
    });

    const state = await collection.stateWhenReady();
    // Not confirmed — local draft should be preserved
    expect(state.size).toBe(0);
  });

  it("invalidate + refetch confirms data after server write", async () => {
    const collection = createFormDetailCollection({
      queryClient,
      formId,
      queryFn: () => fetchFormDetail(formId),
    });

    await collection.stateWhenReady();

    // Simulate: server write happened, now invalidate to refetch
    await queryClient.invalidateQueries({ queryKey: ["form-detail", formId] });
    await new Promise((r) => setTimeout(r, 200));

    const state = await collection.stateWhenReady();
    expect(state.get(formId)).toMatchObject({ id: formId });
  });
});
