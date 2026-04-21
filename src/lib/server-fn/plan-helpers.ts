import { polarClient } from "@/lib/auth/auth";
import { PRO_PRODUCT_IDS } from "@/lib/config/plan-config";
import { logger } from "@/lib/utils";

export type ServerPlan = "free" | "pro" | "biz";

export const getOrgPlan = async (orgId: string): Promise<ServerPlan> => {
  try {
    const iter = await polarClient.subscriptions.list({
      metadata: { referenceId: orgId },
      active: true,
    });
    for await (const page of iter) {
      const items = page.result?.items ?? [];
      for (const sub of items) {
        if (PRO_PRODUCT_IDS.includes(sub.productId as (typeof PRO_PRODUCT_IDS)[number])) {
          return "pro";
        }
      }
      break;
    }
  } catch (error) {
    logger("getOrgPlan failed, defaulting to free", error);
    return "free";
  }
  return "free";
};

type FormPlanInput = {
  branding?: boolean;
  respondentEmailNotifications?: boolean;
  dataRetention?: boolean;
};

export const assertPlanForFormSettings = async (
  orgId: string,
  data: FormPlanInput,
): Promise<void> => {
  const wantsBrandingRemoved = data.branding === false;
  const wantsRespondentEmails = data.respondentEmailNotifications === true;
  const wantsDataRetention = data.dataRetention === true;

  if (!(wantsBrandingRemoved || wantsRespondentEmails || wantsDataRetention)) return;

  const plan = await getOrgPlan(orgId);
  if (plan === "free") {
    throw new Error("This feature requires a Pro subscription. Please upgrade to continue.");
  }
};
