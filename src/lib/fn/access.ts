type WorkspaceRecord = {
  id: string;
  organizationId: string;
};

type FormRecord = {
  id: string;
  workspaceId: string;
  organizationId: string;
};

type AccessAuthorizerDependencies = {
  getWorkspaceById: (workspaceId: string) => Promise<WorkspaceRecord | null>;
  getFormById: (formId: string) => Promise<FormRecord | null>;
  getOrganizationMembershipIdsByUserId: (userId: string) => Promise<string[]>;
};

const ACCESS_DENIED_ERROR = "Not found or access denied";

const assertOrganizationAccess = async (
  organizationId: string,
  userId: string,
  getOrganizationMembershipIdsByUserId: AccessAuthorizerDependencies["getOrganizationMembershipIdsByUserId"],
) => {
  const membershipIds = await getOrganizationMembershipIdsByUserId(userId);
  if (!membershipIds.includes(organizationId)) {
    throw new Error(ACCESS_DENIED_ERROR);
  }
};

export const createAccessAuthorizer = ({
  getWorkspaceById,
  getFormById,
  getOrganizationMembershipIdsByUserId,
}: AccessAuthorizerDependencies) => ({
  authWorkspace: async (workspaceId: string, userId: string) => {
    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace) {
      throw new Error(ACCESS_DENIED_ERROR);
    }

    await assertOrganizationAccess(
      workspace.organizationId,
      userId,
      getOrganizationMembershipIdsByUserId,
    );

    return { workspace };
  },

  authForm: async (formId: string, userId: string) => {
    const form = await getFormById(formId);

    if (!form) {
      throw new Error(ACCESS_DENIED_ERROR);
    }

    await assertOrganizationAccess(
      form.organizationId,
      userId,
      getOrganizationMembershipIdsByUserId,
    );

    return { form };
  },
});
