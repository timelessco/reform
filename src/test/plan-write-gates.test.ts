import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { forms, organization } from "@/db/schema";
import { assertPlanForFormSettings, getOrgPlan } from "@/lib/server-fn/plan-helpers";
import {
  cleanupTestOrg,
  cleanupTestUser,
  createTestForm,
  createTestOrg,
  createTestWorkspace,
  getTestUtils,
  setOrgPlan,
} from "@/test/helpers";

describe("plan-write-gates", () => {
  const ownerId = crypto.randomUUID();
  let orgId: string;
  let workspaceId: string;

  beforeEach(async () => {
    const testUtils = await getTestUtils();
    await testUtils.saveUser(
      testUtils.createUser({
        id: ownerId,
        email: `owner-write-gates-${ownerId}@example.com`,
        name: "Owner Write Gates",
      }),
    );
    const org = await createTestOrg(ownerId);
    orgId = org.id;
    const workspace = await createTestWorkspace(orgId, ownerId);
    workspaceId = workspace.id;
  });

  afterEach(async () => {
    await db.delete(forms).where(eq(forms.workspaceId, workspaceId));
    await cleanupTestUser(ownerId);
    await cleanupTestOrg(orgId);
  });

  describe("getOrgPlan", () => {
    it("returns 'free' for a new org by default", async () => {
      await expect(getOrgPlan(orgId)).resolves.toBe("free");
    });

    it("returns 'pro' after setOrgPlan", async () => {
      await setOrgPlan(orgId, "pro");
      await expect(getOrgPlan(orgId)).resolves.toBe("pro");
    });

    it("returns 'free' for unknown orgId without throwing", async () => {
      await expect(getOrgPlan("non-existent-org")).resolves.toBe("free");
    });

    it("returns 'free' when the cached column holds an unexpected value", async () => {
      // Simulate a manual DB edit putting garbage into the column.
      await db.update(organization).set({ plan: "garbage" }).where(eq(organization.id, orgId));
      await expect(getOrgPlan(orgId)).resolves.toBe("free");
    });
  });

  describe("assertPlanForFormSettings", () => {
    it("passes for free org when no Pro fields are requested", async () => {
      await expect(assertPlanForFormSettings(orgId, {})).resolves.toBeUndefined();
    });

    it("passes for free org with empty customization object", async () => {
      await expect(
        assertPlanForFormSettings(orgId, { customization: {} }),
      ).resolves.toBeUndefined();
    });

    it("rejects free org wanting branding removed", async () => {
      await expect(assertPlanForFormSettings(orgId, { branding: false })).rejects.toThrow(
        /Pro subscription/,
      );
    });

    it("rejects free org enabling respondent emails", async () => {
      await expect(
        assertPlanForFormSettings(orgId, { respondentEmailNotifications: true }),
      ).rejects.toThrow(/Pro subscription/);
    });

    it("rejects free org enabling data retention", async () => {
      await expect(assertPlanForFormSettings(orgId, { dataRetention: true })).rejects.toThrow(
        /Pro subscription/,
      );
    });

    it("rejects free org enabling analytics", async () => {
      await expect(assertPlanForFormSettings(orgId, { analytics: true })).rejects.toThrow(
        /Pro subscription/,
      );
    });

    it("rejects free org saving non-empty customization", async () => {
      await expect(
        assertPlanForFormSettings(orgId, { customization: { primaryColor: "#abcdef" } }),
      ).rejects.toThrow(/Pro subscription/);
    });

    it("rejects free org with multiple Pro fields combined", async () => {
      await expect(
        assertPlanForFormSettings(orgId, {
          branding: false,
          customization: { primaryColor: "#abcdef" },
        }),
      ).rejects.toThrow(/Pro subscription/);
    });

    it("passes for pro org enabling each Pro field", async () => {
      await setOrgPlan(orgId, "pro");
      await expect(assertPlanForFormSettings(orgId, { branding: false })).resolves.toBeUndefined();
      await expect(
        assertPlanForFormSettings(orgId, { respondentEmailNotifications: true }),
      ).resolves.toBeUndefined();
      await expect(
        assertPlanForFormSettings(orgId, { dataRetention: true }),
      ).resolves.toBeUndefined();
      await expect(assertPlanForFormSettings(orgId, { analytics: true })).resolves.toBeUndefined();
      await expect(
        assertPlanForFormSettings(orgId, { customization: { primaryColor: "#abcdef" } }),
      ).resolves.toBeUndefined();
    });

    it("allows free org to flip branding back to true (downgrade their own setting)", async () => {
      await expect(assertPlanForFormSettings(orgId, { branding: true })).resolves.toBeUndefined();
    });

    it("does not rely on a created form — orgId-only check", async () => {
      // Sanity: the assert reads `organization.plan` only, no FK to forms.
      await createTestForm(workspaceId, ownerId);
      await expect(assertPlanForFormSettings(orgId, { analytics: true })).rejects.toThrow(
        /Pro subscription/,
      );
    });
  });
});
