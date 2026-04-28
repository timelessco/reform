# Pro Plan Enforcement & Downgrade Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close every Pro feature-gating leak. Today the plan check happens only at write-time; once a Pro feature is enabled, nothing re-validates the org's plan or cleans up state on subscription cancellation. Result: a user who upgrades, enables Pro features, then downgrades keeps Pro behavior indefinitely. Plus `forms.customization` has no server-side gate at all — free users can bypass the client `<FeatureGate>` by hitting the server fn directly.

**Architecture:** Cache plan on `organization.plan`, kept up-to-date by Polar webhook callbacks. All Pro-gated read paths consult this column (cheap PK lookup) and OR it with the existing per-form column. On subscription cancel/revoke, a single transaction resets gated columns and suspends custom domains.

**Tech Stack:** Drizzle, TanStack Start server fns, Better Auth + `@polar-sh/better-auth` webhook callbacks, vitest with the existing `getTestUtils()` helper.

---

## Pre-existing context (do not recreate)

- `useUserPlan` (`src/hooks/use-user-plan.ts`) — client-side hook. Stays unchanged; it queries Polar via Better Auth and is fine for UI gating.
- `assertPlanForFormSettings` (`src/lib/server-fn/plan-helpers.ts:36`) — write-time gate for `branding`, `respondentEmailNotifications`, `dataRetention`, `analytics`. Does NOT cover `customization`.
- `getOrgPlan` (`src/lib/server-fn/plan-helpers.ts:7`) — currently calls Polar's API on every check. Will be rewritten to read from `organization.plan`.
- `PRO_PRODUCT_IDS` (`src/lib/config/plan-config.ts:7`) — single source of truth for product IDs. Reuse.
- `<FeatureGate>` (`src/components/ui/feature-gate.tsx`) — client UI gate. Untouched by this plan.
- Custom domains: `customDomains.status` is plain `text` (default `'pending'`). Loader serves only `'verified'`. We'll introduce a new value `'suspended'`.
- Polar plugin webhook hooks (`onSubscriptionCreated`, `onSubscriptionActive`, `onSubscriptionUpdated`, `onSubscriptionCanceled`, `onSubscriptionRevoked`, `onSubscriptionUncanceled`) — registered but unused. We'll wire them.
- Test scaffolding: `src/test/helpers.ts` already exposes `getTestUtils()`, `createTestOrg`, `createTestWorkspace`, `createTestForm`, `cleanupTestUser`, `cleanupTestOrg`. Reuse.

## What's missing (this plan delivers)

1. `organization.plan` column + migration.
2. Polar webhook callbacks wired in `auth.ts` to keep `organization.plan` in sync, run cleanup on cancel/revoke, and re-enable on uncancel.
3. `getOrgPlan` rewritten to read from `organization.plan` (no Polar API call on hot paths).
4. `assertPlanForFormSettings` extended to cover `customization` (close pre-existing gap).
5. Defense-in-depth read-time checks in `analytics.ts`, `public-form-view.ts`, `public-submissions.ts`, `custom-domain-loader.ts`.
6. `customDomains.status = 'suspended'` semantics: loader skips, list UI marks as suspended, re-verification needed only if domain expired in Vercel meanwhile (out of scope — just unsuspend back to pre-suspend status).
7. Vitest coverage of every edge case below.

---

## Locked decisions

- **Plan storage:** new column `organization.plan text not null default 'free'`. Values: `'free' | 'pro' | 'biz'`. Type stays `text` (we have no enum infra elsewhere); validate via Zod on writes.
- **Source of truth:** Polar (webhooks). DB column is a cache. On webhook miss we accept staleness — runtime checks read the cached column, not Polar.
- **No backfill migration:** project is in testing, no real users. Existing orgs default to `'free'`; testers re-enter via Polar portal which fires `subscription.updated`.
- **Cleanup scope on downgrade:** reset `forms.{analytics, dataRetention, dataRetentionDays, respondentEmailNotifications}`, force `branding=true`. Leave `forms.customization` untouched (UI re-gates editing on free; no need to wipe stored values). Suspend `customDomains` (don't delete rows).
- **Re-upgrade on `onSubscriptionUncanceled` / `onSubscriptionActive`:** flip `organization.plan='pro'`, unsuspend `customDomains` (move `'suspended'` → previous status; we record the pre-suspend status in a new `previousStatus` column to avoid a second Vercel verify trip). Form columns are NOT auto-restored — user re-enables analytics/retention/etc. manually. Rationale: avoid surprising state on a re-upgrade; user opted out of those settings during downgrade implicitly.
- **`customization` server-side gate:** any non-empty object on free orgs rejects with the same upgrade-required error message used elsewhere in `assertPlanForFormSettings`. Empty `{}` passes (lets free users save other fields without flipping customization).
- **Read-time enforcement style:** plan check is OR'd into existing column checks. Does NOT clear data — just makes the feature behave as if the column were off. Keeps cleanup atomic to the webhook.
- **No client UX changes:** the existing client `<FeatureGate>` already renders the right disabled/upgrade states. This plan is server-side only.

---

## Out of scope

- Client UI changes (`<FeatureGate>`, `useUserPlan`, billing page).
- Data-retention auto-delete cron (doesn't exist yet).
- Backwards-compat backfill (no real users yet).
- BIZ plan logic (no product ID).
- Polar webhook signature replay protection beyond what `webhooks({ secret })` already does.
- Telling form respondents that a form's branding/etc. changed.

---

## Files touched

**Create:**

- `src/db/migrations/<next>_organization_plan.sql` — adds `organization.plan` and `customDomains.previousStatus`.
- `src/lib/server-fn/plan-cleanup.ts` — `applyDowngradeCleanup(orgId, tx)` and `applyUpgradeRestore(orgId, tx)` helpers, both designed to run inside a Drizzle TX.
- `src/test/plan-cleanup.test.ts` — covers downgrade cleanup, suspend + unsuspend, idempotency.
- `src/test/plan-write-gates.test.ts` — covers `assertPlanForFormSettings` including the new `customization` branch.
- `src/test/plan-read-enforcement.test.ts` — covers each gated server fn's read-time behavior on free vs pro.
- `src/test/plan-webhook-handlers.test.ts` — invokes the wired webhook handlers directly with fake payloads, asserts org.plan transitions and side effects.

**Modify:**

- `src/db/schema.ts` — `organization.plan`, `customDomains.previousStatus`.
- `src/lib/server-fn/plan-helpers.ts` — `getOrgPlan` now reads the cached column; `assertPlanForFormSettings` covers `customization`.
- `src/lib/auth/auth.ts` — wire `onSubscriptionCreated/Active/Updated/Canceled/Revoked/Uncanceled` callbacks to call `applyUpgradeRestore` / `applyDowngradeCleanup`.
- `src/lib/server-fn/forms.ts` — pass `customization` to `assertPlanForFormSettings`.
- `src/lib/server-fn/analytics.ts` — `isAnalyticsEnabled` ANDs with `org.plan !== 'free'`.
- `src/lib/server-fn/public-form-view.ts` — when `org.plan === 'free'`, force `branding = true` in `buildPublicFormSettings`.
- `src/lib/server-fn/public-submissions.ts` — skip `respondentEmailNotifications` send when `org.plan === 'free'`.
- `src/lib/server-fn/custom-domain-loader.ts` — already requires `customDomains.status === 'verified'`; `'suspended'` falls through naturally. Add explicit free-plan rejection (cheap: we already join through `forms` → `workspaces` → `organization`).
- `src/test/helpers.ts` — add `setOrgPlan(orgId, plan)` and `seedActiveSubscription(orgId, productId)` helpers. (Builds on the `testUtils.saveUser` / `createTestOrg` pattern shown by the user.)

---

## Tasks

Each task is one commit. After each task: run scoped tests (`bun test src/test/plan-*`). Do NOT run `vite build` or `tsc --noEmit`.

### Task 1 — Schema: `organization.plan` + `customDomains.previousStatus`

**Touch:** `src/db/schema.ts`, new migration SQL file under `src/db/migrations/`.

```ts
// organization
plan: text().notNull().default("free"),

// customDomains
previousStatus: text(),
```

Migration:

```sql
ALTER TABLE "organization" ADD COLUMN "plan" text NOT NULL DEFAULT 'free';
ALTER TABLE "custom_domains" ADD COLUMN "previous_status" text;
```

**Tests:** none yet — schema-only.

### Task 2 — Rewrite `getOrgPlan` to read the cached column

**Touch:** `src/lib/server-fn/plan-helpers.ts`.

- Replace the Polar API call with `db.select({ plan: organization.plan }).from(organization).where(eq(organization.id, orgId))`. Default to `'free'` if missing.
- Add Zod validation when reading (defense — if someone manually inserts garbage, treat as free).
- Keep the function async (callers don't change).

**Tests in `src/test/plan-write-gates.test.ts`:**

- `getOrgPlan` returns `'free'` for a new org (default).
- `getOrgPlan` returns `'pro'` after `setOrgPlan(orgId, 'pro')` test helper.
- `getOrgPlan` returns `'free'` for unknown orgId (graceful fallback, not throw).

### Task 3 — Cover `customization` in `assertPlanForFormSettings`

**Touch:** `src/lib/server-fn/plan-helpers.ts`, `src/lib/server-fn/forms.ts`.

- Extend `FormPlanInput` with `customization?: Record<string, unknown> | null`.
- Treat `customization` as Pro-only when present and **non-empty** (Object.keys().length > 0). Empty object passes.
- Pass `customization` through from `forms.ts` into the assert.
- Update the create flow too (`forms.ts` create handler) — currently customization is in the create input but not asserted.

**Tests in `src/test/plan-write-gates.test.ts`:**

- Free org: `assertPlanForFormSettings({ customization: { primaryColor: "#000" } })` throws.
- Free org: `assertPlanForFormSettings({ customization: {} })` passes (empty object is a no-op).
- Free org: `assertPlanForFormSettings({})` passes when nothing Pro is requested.
- Pro org: `assertPlanForFormSettings({ customization: { primaryColor: "#000" } })` passes.
- Combinations: free org with `branding=false` AND `customization` non-empty throws (single throw, doesn't matter which trips it).
- Branding existing path stays correct (regression check).

### Task 4 — Plan cleanup helpers

**Touch:** new `src/lib/server-fn/plan-cleanup.ts`.

```ts
applyDowngradeCleanup(orgId, tx);
applyUpgradeRestore(orgId, tx);
```

`applyDowngradeCleanup` (in a single TX):

1. `update organization set plan='free' where id=$orgId`.
2. `update forms set analytics=false, dataRetention=false, dataRetentionDays=null, respondentEmailNotifications=false, branding=true where workspaceId in (select id from workspaces where organizationId=$orgId)`.
3. For every `customDomains` row in the org where `status != 'suspended'`: copy `status → previousStatus`, set `status='suspended'`. Idempotent: if already `'suspended'`, leave it.

`applyUpgradeRestore` (single TX):

1. `update organization set plan='pro'`.
2. For every `customDomains` row where `status='suspended'` AND `previousStatus is not null`: set `status=previousStatus`, `previousStatus=null`. If `previousStatus` is null but row is suspended (rare), set status='pending'.
3. **Does NOT touch forms** — user must manually re-enable Pro form settings.

Both helpers accept an optional `tx` so the webhook handlers can compose them into one transaction.

**Tests in `src/test/plan-cleanup.test.ts`:**

- **Downgrade flips org plan to free** — pro org, run downgrade, plan='free'.
- **Downgrade resets every gated form column** — seed two forms with all gated columns true/customized, run downgrade, assert all reset to defaults except `customization` which is preserved.
- **Downgrade preserves `customization`** — seed customization, run downgrade, customization unchanged.
- **Downgrade suspends every verified domain** — seed two domains (one `verified`, one `pending`), run downgrade, both `'suspended'` with correct `previousStatus` recorded.
- **Downgrade is idempotent** — running it twice produces identical state, doesn't double-overwrite `previousStatus`.
- **Upgrade restores domains using `previousStatus`** — `verified → suspended → upgrade → verified`.
- **Upgrade does not auto-restore form columns** — analytics stays false even after upgrade.
- **Cross-org isolation** — cleanup in org A leaves org B's forms/domains untouched.
- **Empty org** — cleanup on org with no forms/domains is a no-op (no error).

### Task 5 — Wire Polar webhook callbacks

**Touch:** `src/lib/auth/auth.ts`.

Inside the `polar({ ... })` config, replace `webhooks({ secret })` with the full callback set:

```ts
webhooks({
  secret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onSubscriptionCreated: async (payload) => upgrade(payload),
  onSubscriptionActive: async (payload) => upgrade(payload),
  onSubscriptionUpdated: async (payload) => routeByStatus(payload),
  onSubscriptionCanceled: async (payload) => downgrade(payload),
  onSubscriptionRevoked: async (payload) => downgrade(payload),
  onSubscriptionUncanceled: async (payload) => upgrade(payload),
});
```

Internal helpers:

- `extractOrgId(payload)`: read `payload.data.metadata.referenceId` (Polar pattern). Bail (log + return) if missing.
- `productIdToPlan(productId)`: returns `'pro'` or `'free'` using `PRO_PRODUCT_IDS`.
- `upgrade(payload)`: in a TX, call `applyUpgradeRestore(orgId, tx)`.
- `downgrade(payload)`: in a TX, call `applyDowngradeCleanup(orgId, tx)`.
- `routeByStatus(payload)`: if subscription is now `active` and product is Pro → upgrade; if `canceled`/`revoked` or product is Free → downgrade. Avoids duplicating the create/cancel paths.

All handlers swallow errors with `logger(...)` to avoid wedging the webhook channel — Polar will retry per their delivery policy and we'll be eventually consistent.

**Tests in `src/test/plan-webhook-handlers.test.ts`:**

(These import the handler functions directly — extract them as exported helpers from `auth.ts` if needed, e.g. into `src/lib/auth/polar-handlers.ts`, so the test can call them without the betterAuth runtime.)

- `onSubscriptionCreated` with Pro product → org plan flips to `'pro'`, suspended domains restore.
- `onSubscriptionActive` for non-Pro product → no-op (plan stays free).
- `onSubscriptionCanceled` → org plan flips to `'free'`, all gated form columns reset, domains suspended.
- `onSubscriptionRevoked` after `onSubscriptionCanceled` → idempotent, no extra writes (verify by checking `previousStatus` not double-overwritten).
- `onSubscriptionUncanceled` after cancel → org plan flips back to `'pro'`, domains restored to `previousStatus`.
- Webhook payload missing `referenceId` → handler logs + returns, no DB writes, no throw.
- Webhook with unknown `referenceId` (orphan org) → handler returns gracefully.
- Concurrent cancel + revoke (race) → final state is downgraded; second handler is a no-op.
- Pro user upgrades, enables analytics, downgrades, re-upgrades → analytics stays `false` (intentional).

### Task 6 — Read-time enforcement: analytics

**Touch:** `src/lib/server-fn/analytics.ts`.

`isAnalyticsEnabled(formId)` becomes:

```ts
const [row] = await db
  .select({ analytics: forms.analytics, plan: organization.plan })
  .from(forms)
  .innerJoin(workspaces, eq(workspaces.id, forms.workspaceId))
  .innerJoin(organization, eq(organization.id, workspaces.organizationId))
  .where(eq(forms.id, formId));
return row?.analytics === true && row.plan !== "free";
```

(Verify `workspaces` is the right join — confirm in `src/db/schema.ts`. If forms have a direct orgId now, simplify.)

**Tests in `src/test/plan-read-enforcement.test.ts`:**

- Pro org + `forms.analytics=true` → `recordFormVisit` writes a row, `getFormInsights` returns real data.
- Free org + `forms.analytics=true` (simulating downgrade-without-cleanup, e.g. webhook missed) → `recordFormVisit` no-ops (returns `{ visitId: null }`), `getFormInsights` returns canonical zero state.
- Pro org + `forms.analytics=false` → no-op (existing behavior, regression check).
- Free org + `forms.analytics=false` → no-op.
- After webhook fires `onSubscriptionRevoked`, `forms.analytics` is `false` AND plan is `'free'` → both checks reinforce.
- `recordQuestionProgress` follows the same rules.

### Task 7 — Read-time enforcement: branding

**Touch:** `src/lib/server-fn/public-form-view.ts`.

In `getPublishedFormById`, after loading form + version, also fetch the org plan in the same query (or extra query) and pass into `buildPublicFormSettings`:

```ts
const effectiveBranding = orgPlan === "free" ? true : form.branding;
const settings = buildPublicFormSettings(snapshotSettings, { branding: effectiveBranding });
```

Same for `src/lib/server-fn/custom-domain-loader.ts` if it builds the same settings (verify and apply consistently).

**Tests in `src/test/plan-read-enforcement.test.ts`:**

- Pro org + `forms.branding=false` → settings.branding === false (Pro feature works).
- Free org + `forms.branding=false` (post-downgrade-without-cleanup) → settings.branding === true (forced).
- Pro org + `forms.branding=true` → settings.branding === true.
- Free org + `forms.branding=true` → settings.branding === true.

### Task 8 — Read-time enforcement: respondent emails

**Touch:** `src/lib/server-fn/public-submissions.ts`.

Just before the `if (settings.respondentEmailNotifications)` block, fetch org plan (cached per request) and AND it in:

```ts
if (settings.respondentEmailNotifications && orgPlan !== "free") { ... }
```

**Tests in `src/test/plan-read-enforcement.test.ts`:**

- Pro org + `respondentEmailNotifications=true` → confirmation email send is invoked (mock asserts called once).
- Free org + `respondentEmailNotifications=true` → send is NOT invoked.
- Pro org + `respondentEmailNotifications=false` → not invoked (regression).
- Self/owner notification path is unaffected (it's not a Pro feature).

### Task 9 — Read-time enforcement: custom domains

**Touch:** `src/lib/server-fn/custom-domain-loader.ts`.

The hot path already filters `customDomains.status='verified'`. Add a join to `organization.plan` and reject when free:

```ts
.where(and(
  eq(customDomains.domain, hostname),
  eq(customDomains.status, "verified"),
  ne(organization.plan, "free"),
));
```

**Tests in `src/test/plan-read-enforcement.test.ts`:**

- Pro org + `verified` domain → loader resolves the form.
- Free org + `verified` domain (race, no webhook yet) → loader returns nothing (404 falls through).
- Suspended domain (post-downgrade-cleanup) → loader returns nothing.
- After re-upgrade, domain status restored to `'verified'` → loader resolves again.

### Task 10 — Test helpers

**Touch:** `src/test/helpers.ts`.

Add:

```ts
export const setOrgPlan = async (orgId, plan) =>
  db.update(organization).set({ plan }).where(eq(organization.id, orgId));

export const createTestCustomDomain = async (orgId, status = "verified") => { ... };
```

These keep the test files from each rolling their own SQL.

The user-supplied pattern stays the canonical user creation:

```ts
const testUtils = await getTestUtils();
await testUtils.saveUser(
  testUtils.createUser({
    id: ownerId,
    email: `owner-plan-${ownerId}@example.com`,
    name: "Owner Plan",
  }),
);
```

---

## Edge cases checklist (must be covered by tests)

This is the explicit list of every gate-leak edge case I want green tests for. Map each one to a test in the files above before claiming Task N done.

1. **Plan flip without cleanup** — webhook delayed/lost. For each Pro feature, verify runtime check still gates correctly: analytics, branding, respondent emails, custom domains, customization (write).
2. **Cleanup runs but webhook fires twice** — idempotency: `applyDowngradeCleanup` second call is a no-op, `previousStatus` not stomped.
3. **Re-upgrade via `onSubscriptionUncanceled`** — domains restore to pre-suspend `previousStatus`. Form columns stay at their downgrade-reset values (analytics false, etc.).
4. **Re-upgrade via fresh `onSubscriptionCreated`** — same as above (we route both through `applyUpgradeRestore`).
5. **Webhook payload missing `referenceId`** — handler logs and returns; no DB writes.
6. **Webhook for org that doesn't exist locally** — graceful no-op.
7. **Org with zero forms / zero domains** — cleanup and restore are no-ops, don't error.
8. **Customization edge** — empty `{}` passes free, non-empty `{primaryColor:"#x"}` rejects free, anything passes pro.
9. **Customization on create vs update** — both gated identically.
10. **Branding flip** — flipping branding from `true → false` rejected on free; `false → true` allowed (downgrading their own setting).
11. **Data retention** — same rejection rules even though no cron exists yet (forward-compat).
12. **Respondent emails without an email field** — orthogonal to plan, but regression: with email field + Pro it sends, without email field + Pro it doesn't (existing `hasEmailField` path).
13. **Custom domain assign flow** — `assignFormDomain` already plan-checks at write time; verify it still works post-refactor (regression).
14. **Custom domain serve flow under each combination:** {plan: pro|free} × {status: pending|verified|suspended}. Only `pro × verified` resolves.
15. **Multiple orgs same user** — user belongs to org A (pro) and org B (free). Form in B can't enable Pro features even with active session in A. (Asserts that the gate is per-form's-org, not per-active-session-org.)
16. **Direct server fn invocation bypassing UI** — call `updateForm` with `customization={primaryColor:"#000"}` from a free-org user, expect rejection. (This is the pre-existing leak we're closing.)
17. **Analytics zero-state when plan flips mid-day** — query insights, expect canonical zero-state payload (correct date range, empty arrays), not a 500.
18. **Insights for forms whose org was deleted** — out of scope (workspace deletion already cascades).
19. **Test-runner isolation** — every test cleans up its org/user/forms in `afterEach` so suites don't bleed (existing pattern in `submission-notifications.test.ts`).

---

## Manual verification (after all tasks)

These confirm the wiring end-to-end against Polar sandbox before merging:

1. Free org → toggle analytics in UI → expect rejection from `assertPlanForFormSettings`.
2. Upgrade to Pro via Polar checkout → wait for webhook → `select plan from organization where id=...` returns `'pro'` → toggle analytics on → page tracks.
3. Cancel via Polar portal → webhook fires `onSubscriptionCanceled` → `select plan, ...analytics columns from forms ...` shows reset state, `customDomains.status='suspended'`.
4. Hit a published form on its custom domain post-cancel → 404 / fallback.
5. Uncancel via Polar → domain serves again, plan back to `'pro'`, analytics column STILL false (user must re-enable).

---

## Skills to use

| Step      | Skill                                                                    | Why                                                                                        |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Task 4, 5 | `superpowers:test-driven-development`                                    | Cleanup helpers + webhook handlers benefit from tests-first; pure logic, easy to assert.   |
| Task 5    | `superpowers:systematic-debugging` if a Polar payload shape surprises us | TypeScript types from `@polar-sh/sdk` are the source of truth.                             |
| All tasks | `no-use-effect`                                                          | We're touching server fns, but if any client UI sneaks in, no `useEffect` for plan checks. |
| After all | `superpowers:requesting-code-review`                                     | Cross-cutting change touching auth, billing, public form serving.                          |
| After all | `superpowers:verification-before-completion`                             | Run the full `bun test` suite + manual verification checklist before claiming done.        |
