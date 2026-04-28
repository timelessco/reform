import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { requiresProForFormSettings } from "@/lib/server-fn/plan-helpers";
import { getOrgPlan } from "@/lib/server-fn/plan-helpers.server";
import {
  cleanupTestOrg,
  cleanupTestUser,
  createTestOrg,
  getTestUtils,
  setOrgPlan,
} from "@/test/helpers";

describe("plan-write-gates", () => {
  describe("getOrgPlan", () => {
    const ownerId = crypto.randomUUID();
    let orgId: string;

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
    });

    afterEach(async () => {
      await cleanupTestUser(ownerId);
      await cleanupTestOrg(orgId);
    });

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
      await db.update(organization).set({ plan: "garbage" }).where(eq(organization.id, orgId));
      await expect(getOrgPlan(orgId)).resolves.toBe("free");
    });
  });

  describe("requiresProForFormSettings (pure predicate)", () => {
    it("false when no Pro fields are present", () => {
      expect(requiresProForFormSettings({})).toBeFalsy();
    });

    it("false when customization is an empty object", () => {
      expect(requiresProForFormSettings({ customization: {} })).toBeFalsy();
    });

    it("true when branding is being removed", () => {
      expect(requiresProForFormSettings({ branding: false })).toBeTruthy();
    });

    it("true when respondent emails are enabled", () => {
      expect(requiresProForFormSettings({ respondentEmailNotifications: true })).toBeTruthy();
    });

    it("true when data retention is enabled", () => {
      expect(requiresProForFormSettings({ dataRetention: true })).toBeTruthy();
    });

    it("true when analytics is enabled", () => {
      expect(requiresProForFormSettings({ analytics: true })).toBeTruthy();
    });

    it("true when customization is non-empty", () => {
      expect(
        requiresProForFormSettings({ customization: { primaryColor: "#abcdef" } }),
      ).toBeTruthy();
    });

    it("true when multiple Pro fields are combined", () => {
      expect(
        requiresProForFormSettings({
          branding: false,
          customization: { primaryColor: "#abcdef" },
        }),
      ).toBeTruthy();
    });

    it("false when branding is explicitly true (allowing free orgs to keep branding on)", () => {
      expect(requiresProForFormSettings({ branding: true })).toBeFalsy();
    });

    it("false when respondent emails / data retention / analytics are explicitly false", () => {
      expect(
        requiresProForFormSettings({
          respondentEmailNotifications: false,
          dataRetention: false,
          analytics: false,
        }),
      ).toBeFalsy();
    });
  });
});
