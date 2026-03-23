import { auth } from "@/lib/auth";
import type { TestHelpers } from "better-auth/plugins";

export const getBetterAuthTestHelpers = async (): Promise<TestHelpers> => {
  const context = await auth.$context;

  if (!context.test) {
    throw new Error("Better Auth test utils are not available. Ensure NODE_ENV is 'test'.");
  }

  return context.test;
};

type OrganizationTestHelpers = TestHelpers & {
  addMember: NonNullable<TestHelpers["addMember"]>;
  createOrganization: NonNullable<TestHelpers["createOrganization"]>;
  deleteOrganization: NonNullable<TestHelpers["deleteOrganization"]>;
  saveOrganization: NonNullable<TestHelpers["saveOrganization"]>;
};

export const getBetterAuthOrganizationTestHelpers = async (): Promise<OrganizationTestHelpers> => {
  const testHelpers = await getBetterAuthTestHelpers();

  if (
    !testHelpers.createOrganization ||
    !testHelpers.saveOrganization ||
    !testHelpers.addMember ||
    !testHelpers.deleteOrganization
  ) {
    throw new Error("Better Auth organization test helpers are not available");
  }

  return testHelpers as OrganizationTestHelpers;
};
