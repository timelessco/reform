import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/auth/auth-client";
import { PRO_PRODUCT_IDS } from "@/lib/config/plan-config";

export type UserPlan = "free" | "pro" | "biz";

export type UseUserPlanResult = {
  isPro: boolean;
  isBiz: boolean;
  isFree: boolean;
  isLoading: boolean;
  plan: UserPlan;
};

export const useUserPlan = (): UseUserPlanResult => {
  const { data: customerState, isLoading } = useQuery({
    ...auth.customer.state.queryOptions(),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const activeSubscription = customerState?.activeSubscriptions?.[0];
  const productId = activeSubscription?.productId ?? "";
  const isPro = PRO_PRODUCT_IDS.includes(productId as (typeof PRO_PRODUCT_IDS)[number]);
  const isBiz = false;
  const isFree = !(isPro || isBiz);
  const plan: UserPlan = isBiz ? "biz" : isPro ? "pro" : "free";

  return { isPro, isBiz, isFree, isLoading, plan };
};
