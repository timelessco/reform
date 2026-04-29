export const PLAN_PRODUCT_IDS = {
  free: "398f06f7-a6f6-4f65-80b6-62e38bd2825c",
  pro: "3662224a-d998-4a73-bf82-4957198d53ea",
  proYearly: "0be62924-d418-4dcc-8c8c-2b4929f76695",
} as const;

export const PRO_PRODUCT_IDS = [PLAN_PRODUCT_IDS.pro, PLAN_PRODUCT_IDS.proYearly];

// `maxDomainsPerOrg` is our product-level cap. Vercel's own project soft caps
// are separate: 100,000/project on Pro, 1,000,000 on Enterprise. If we ever
// approach those (e.g., aggregating across all tenants), request a raise via
// Vercel support — see https://vercel.com/docs/multi-tenant/limits.
export const DOMAIN_LIMITS = {
  maxDomainsPerOrg: 5,
} as const;

export const RESERVED_SLUGS = new Set([
  "f",
  "api",
  "health",
  "login",
  "forms",
  "settings",
  "_authenticated",
  "workspace",
  "accept-invite",
]);
