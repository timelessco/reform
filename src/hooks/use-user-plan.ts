import { useQuery } from "@tanstack/react-query";
import { auth, useSession } from "@/lib/auth/auth-client";
import { PRO_PRODUCT_IDS } from "@/lib/config/plan-config";

export type UserPlan = "free" | "pro" | "biz";

export type UseUserPlanResult = {
  isPro: boolean;
  isBiz: boolean;
  isFree: boolean;
  isLoading: boolean;
  plan: UserPlan;
};

type SubscriptionsListResult = {
  result?: { items?: Array<{ productId: string }> };
};

export const useUserPlan = (orgIdOverride?: string): UseUserPlanResult => {
  const { data: session } = useSession();
  const sessionOrgId = session?.session?.activeOrganizationId as string | undefined;
  const orgId = orgIdOverride ?? sessionOrgId;

  const { data, isLoading } = useQuery({
    ...auth.customer.subscriptions.list.queryOptions({
      query: { referenceId: orgId ?? "", active: true },
    }),
    enabled: Boolean(orgId),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const items = (data as SubscriptionsListResult | undefined)?.result?.items ?? [];
  const productId = items[0]?.productId ?? "";
  const isPro = PRO_PRODUCT_IDS.includes(productId as (typeof PRO_PRODUCT_IDS)[number]);
  const isBiz = false;
  const isFree = !(isPro || isBiz);
  const plan: UserPlan = isBiz ? "biz" : isPro ? "pro" : "free";

  return { isPro, isBiz, isFree, isLoading, plan };
};
