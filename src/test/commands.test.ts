import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QueryClient } from "@tanstack/query-core";
import { desc, eq, inArray, not } from "drizzle-orm";
import { createCommandLayer } from "@/db-collections/commands";
import type { WorkspaceSummary } from "@/db-collections/workspace-query.collection";
import type { FormDetail } from "@/db-collections/form-detail-query.collection";
import type { FormFavorite, FormListing } from "@/db-collections/form-listing-query.collection";
import { db } from "@/lib/db";
import { formFavorites, forms, member, workspaces } from "@/db/schema";
import {
  cleanupTestOrg,
  cleanupTestUser,
  createTestForm,
  createTestMember,
  createTestOrg,
  createTestWorkspace,
  getTestUtils,
} from "@/test/helpers";

// --- Test DB fetchers ---
const fetchWorkspacesWithForms = async (
  userId: string,
): Promise<{ workspaces: WorkspaceSummary[] }> => {
  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));
  if (memberships.length === 0) return { workspaces: [] };
  const orgIds = memberships.map((m) => m.organizationId);
  const [wsList, fList] = await Promise.all([
    db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.organizationId, orgIds))
      .orderBy(workspaces.createdAt),
    db
      .select({
        id: forms.id,
        title: forms.title,
        updatedAt: forms.updatedAt,
        workspaceId: forms.workspaceId,
      })
      .from(forms)
      .where(not(eq(forms.status, "archived")))
      .orderBy(desc(forms.updatedAt)),
  ]);
  const byWs = fList.reduce(
    (acc, f) => {
      acc[f.workspaceId] = acc[f.workspaceId] || [];
      acc[f.workspaceId].push({ ...f, updatedAt: f.updatedAt.toISOString() });
      return acc;
    },
    {} as Record<string, unknown[]>,
  );
  return {
    workspaces: wsList.map((ws) => ({
      ...ws,
      createdByUserId: ws.createdByUserId,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
      forms: byWs[ws.id] || [],
    })),
  };
};

const fetchFormListings = async (userId: string): Promise<FormListing[]> => {
  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));
  if (memberships.length === 0) return [];
  const orgIds = memberships.map((m) => m.organizationId);
  const wsIds = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(inArray(workspaces.organizationId, orgIds));
  const all = await db
    .select()
    .from(forms)
    .where(not(eq(forms.status, "archived")));
  return all
    .filter((f) => wsIds.some((w) => w.id === f.workspaceId))
    .map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status,
      updatedAt: f.updatedAt.toISOString(),
      createdAt: f.createdAt.toISOString(),
      workspaceId: f.workspaceId,
      icon: f.icon,
      formName: f.formName,
      submissionCount: 0,
    }));
};

const fetchFormDetail = async (formId: string): Promise<FormDetail | null> => {
  const [f] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!f) return null;
  return {
    id: f.id,
    title: f.title,
    status: f.status,
    workspaceId: f.workspaceId,
    content: f.content as unknown as unknown[],
    settings: f.settings as unknown as Record<string, unknown>,
    customization: (f.customization ?? {}) as Record<string, unknown>,
    formName: f.formName,
    schemaName: f.schemaName,
    icon: f.icon,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    createdByUserId: f.createdByUserId,
  };
};

const fetchFavorites = async (userId: string): Promise<FormFavorite[]> => {
  const favs = await db.select().from(formFavorites).where(eq(formFavorites.userId, userId));
  return favs.map((f) => ({
    id: f.id,
    userId: f.userId,
    formId: f.formId,
    createdAt: f.createdAt.toISOString(),
  }));
};

describe("command layer", () => {
  const ownerId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  let orgId: string;
  let workspaceId: string;
  let formId: string;
  let queryClient: QueryClient;

  beforeEach(async () => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const t = await getTestUtils();
    await t.saveUser(
      t.createUser({ id: ownerId, email: `owner-cmd-${ownerId}@example.com`, name: "Owner" }),
    );
    await t.saveUser(
      t.createUser({ id: memberId, email: `member-cmd-${memberId}@example.com`, name: "Member" }),
    );
    const org = await createTestOrg(ownerId);
    orgId = org.id as string;
    await createTestMember(memberId, orgId);
    const ws = await createTestWorkspace(orgId, ownerId);
    workspaceId = ws.id;
    const form = await createTestForm(workspaceId, ownerId);
    formId = form.id;
  });

  afterEach(async () => {
    await db.delete(formFavorites).where(eq(formFavorites.userId, memberId));
    queryClient.clear();
    await cleanupTestUser(memberId);
    await cleanupTestUser(ownerId);
    await cleanupTestOrg(orgId);
  });

  it("workspace insert is optimistic and calls server fn", async () => {
    const createWs = vi.fn().mockResolvedValue({});
    const cmds = createCommandLayer({
      queryClient,
      serverFns: {
        getWorkspacesWithForms: () => fetchWorkspacesWithForms(memberId),
        getFormListings: () => fetchFormListings(memberId),
        getFormDetail: fetchFormDetail,
        getFavorites: () => fetchFavorites(memberId),
        createWorkspace: createWs,
        updateWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        createForm: vi.fn(),
        updateForm: vi.fn(),
        deleteForm: vi.fn(),
        addFavorite: vi.fn(),
        removeFavorite: vi.fn(),
      },
    });

    await cmds.workspaces.stateWhenReady();
    const newId = crypto.randomUUID();
    cmds.workspaces.insert({
      id: newId,
      name: "Command WS",
      organizationId: orgId,
      createdByUserId: memberId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      forms: [],
    });

    // Optimistic: visible immediately
    expect(cmds.workspaces.get(newId)).toMatchObject({ name: "Command WS" });
    // Wait for server call
    await new Promise((r) => setTimeout(r, 100));
    expect(createWs).toHaveBeenCalledWith(
      expect.objectContaining({ id: newId, name: "Command WS" }),
    );
  });

  it("favorite add calls server addFavorite", async () => {
    const addFav = vi.fn().mockResolvedValue({});
    const cmds = createCommandLayer({
      queryClient,
      serverFns: {
        getWorkspacesWithForms: () => fetchWorkspacesWithForms(memberId),
        getFormListings: () => fetchFormListings(memberId),
        getFormDetail: fetchFormDetail,
        getFavorites: () => fetchFavorites(memberId),
        createWorkspace: vi.fn(),
        updateWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        createForm: vi.fn(),
        updateForm: vi.fn(),
        deleteForm: vi.fn(),
        addFavorite: addFav,
        removeFavorite: vi.fn(),
      },
    });

    await cmds.favorites.stateWhenReady();
    const favId = `${memberId}:${formId}`;
    cmds.favorites.insert({
      id: favId,
      userId: memberId,
      formId,
      createdAt: new Date().toISOString(),
    });

    // Optimistic
    expect(cmds.favorites.get(favId)).toBeDefined();
    await new Promise((r) => setTimeout(r, 100));
    expect(addFav).toHaveBeenCalledWith(expect.objectContaining({ formId }));
  });

  it("form listings include form data through command layer", async () => {
    const cmds = createCommandLayer({
      queryClient,
      serverFns: {
        getWorkspacesWithForms: () => fetchWorkspacesWithForms(memberId),
        getFormListings: () => fetchFormListings(memberId),
        getFormDetail: fetchFormDetail,
        getFavorites: () => fetchFavorites(memberId),
        createWorkspace: vi.fn(),
        updateWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        createForm: vi.fn(),
        updateForm: vi.fn(),
        deleteForm: vi.fn(),
        addFavorite: vi.fn(),
        removeFavorite: vi.fn(),
      },
    });

    const state = await cmds.formListings.stateWhenReady();
    expect(state.get(formId)).toMatchObject({ id: formId, status: "draft" });
  });
});
