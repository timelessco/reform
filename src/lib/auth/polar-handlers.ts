import type { WebhookSubscriptionActivePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionactivepayload";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload";
import type { WebhookSubscriptionUncanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionuncanceledpayload";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload";
import { PRO_PRODUCT_IDS } from "@/lib/config/plan-config";
import { logger } from "@/lib/utils";

// `plan-cleanup` is imported lazily to keep `@/db` (and its `pg` dependency)
// out of any client bundle that picks up `auth.ts` via a `type`-only import
// from `@/lib/auth/auth` (e.g. `__root.tsx` reading `Session`).

// Errors are swallowed via the logger so a failed write doesn't wedge Polar's
// delivery channel — Polar retries, and read-time gates cover the gap.

type SubscriptionPayload =
  | WebhookSubscriptionActivePayload
  | WebhookSubscriptionCanceledPayload
  | WebhookSubscriptionCreatedPayload
  | WebhookSubscriptionRevokedPayload
  | WebhookSubscriptionUncanceledPayload
  | WebhookSubscriptionUpdatedPayload;

const isProProduct = (productId: string | undefined): boolean =>
  productId != null && PRO_PRODUCT_IDS.includes(productId as (typeof PRO_PRODUCT_IDS)[number]);

const extractOrgId = (payload: SubscriptionPayload): string | null => {
  const metadata = payload.data.metadata as { referenceId?: unknown } | null | undefined;
  const referenceId = metadata?.referenceId;
  return typeof referenceId === "string" && referenceId.length > 0 ? referenceId : null;
};

export const handleSubscriptionUpgrade = async (payload: SubscriptionPayload): Promise<void> => {
  const orgId = extractOrgId(payload);
  if (!orgId) {
    logger("[polar] subscription event missing referenceId metadata", payload.type);
    return;
  }
  if (!isProProduct(payload.data.productId)) {
    logger("[polar] non-pro product on upgrade event, no plan change", payload.type, orgId);
    return;
  }
  try {
    const { applyUpgradeRestore } = await import("@/lib/server-fn/plan-cleanup");
    await applyUpgradeRestore(orgId);
  } catch (error) {
    logger("[polar] applyUpgradeRestore failed", orgId, error);
  }
};

export const handleSubscriptionDowngrade = async (payload: SubscriptionPayload): Promise<void> => {
  const orgId = extractOrgId(payload);
  if (!orgId) {
    logger("[polar] subscription event missing referenceId metadata", payload.type);
    return;
  }
  try {
    const { applyDowngradeCleanup } = await import("@/lib/server-fn/plan-cleanup");
    await applyDowngradeCleanup(orgId);
  } catch (error) {
    logger("[polar] applyDowngradeCleanup failed", orgId, error);
  }
};

// `subscription.updated` covers many transitions; we only act on `active` and
// `canceled` to avoid double-running with the dedicated created/canceled hooks.
export const handleSubscriptionUpdated = async (
  payload: WebhookSubscriptionUpdatedPayload,
): Promise<void> => {
  const status = payload.data.status;
  if (status === "active" && isProProduct(payload.data.productId)) {
    await handleSubscriptionUpgrade(payload);
    return;
  }
  if (status === "canceled") {
    await handleSubscriptionDowngrade(payload);
  }
};
