# Feature Gating Implementation Plan

## Problem

Pro/BIZ badges exist throughout the UI but are purely cosmetic. Free users can toggle Pro features without restriction. No shared mechanism checks subscription status.

## Product IDs (Polar)

| Plan          | Product ID                             | Slug           |
| ------------- | -------------------------------------- | -------------- |
| Free          | `398f06f7-a6f6-4f65-80b6-62e38bd2825c` | `free`         |
| Pro (Monthly) | `3662224a-d998-4a73-bf82-4957198d53ea` | `Pro`          |
| Pro (Yearly)  | `0be62924-d418-4dcc-8c8c-2b4929f76695` | `Pro-(Yearly)` |
| Business      | Not configured yet                     | —              |

## Features to Gate

### Pro Features

| Feature                  | File                        | Line(s) | Gate Type                         |
| ------------------------ | --------------------------- | ------- | --------------------------------- |
| Reform branding toggle   | `settings-content.tsx`      | 268-291 | Disable switch + upgrade prompt   |
| Respondent emails toggle | `settings-content.tsx`      | 416-444 | Disable switch + upgrade prompt   |
| Analytics toggle         | `share-summary-sidebar.tsx` | 198     | Disable switch + upgrade prompt   |
| Custom Domain            | `embed-config-panel.tsx`    | 488-496 | Already disabled, wire to plan    |
| Layout customization     | `customize-sidebar.tsx`     | 410     | Collapse section + upgrade prompt |
| Typography customization | `customize-sidebar.tsx`     | 470     | Collapse section + upgrade prompt |
| Title customization      | `customize-sidebar.tsx`     | 504     | Collapse section + upgrade prompt |
| Colors (advanced)        | `customize-sidebar.tsx`     | 572     | Collapse section + upgrade prompt |
| Custom CSS               | `customize-sidebar.tsx`     | 589     | Collapse section + upgrade prompt |

### BIZ Features

| Feature               | File                   | Line(s) | Gate Type                       |
| --------------------- | ---------------------- | ------- | ------------------------------- |
| Data retention toggle | `settings-content.tsx` | 293-316 | Disable switch + upgrade prompt |

---

## Implementation Steps

### Step 1: Create `useUserPlan` hook

**File:** `src/hooks/use-user-plan.ts`

**Skills:** None required — pure data hook.

Query `auth.customer.state` (same pattern as billing page) and expose plan booleans. Cache aggressively since plan changes are rare.

```typescript
// Derived state — no useEffect needed (no-use-effect rule)
const activeSubscription = customerState?.activeSubscriptions?.[0];
const isPro = PRO_PRODUCT_IDS.includes(activeSubscription?.productId ?? "");
const isBiz = false; // Wire up when BIZ plan exists
const isFree = !isPro && !isBiz;
```

**Returns:**

```typescript
{
  isPro: boolean;
  isBiz: boolean;
  isFree: boolean;
  isLoading: boolean;
  plan: "free" | "pro" | "biz";
}
```

**Key decisions:**

- Product IDs should live in a shared constant file (`src/lib/config/plan-config.ts`)
- Use `staleTime: 1000 * 60 * 10` (10 min) to match billing page pattern
- Hook uses `auth.customer.state.queryOptions()` from `@/lib/auth/auth-client`

### Step 2: Create `<FeatureGate>` component

**File:** `src/components/ui/feature-gate.tsx`

**Skills:** `superpowers:brainstorming` — decide on the UX pattern for gated features.

A wrapper component that:

- Renders children normally if user has the required plan
- Disables interactive children (switches, inputs) if not on required plan
- Shows an upgrade tooltip/popover on click when gated

```typescript
type FeatureGateProps = {
  requiredPlan: "pro" | "biz";
  children: React.ReactNode;
  // Optional: custom fallback instead of default disabled state
  fallback?: React.ReactNode;
};
```

**UX pattern:**

- Switches: render disabled with reduced opacity
- Sections (customize sidebar): collapse with a lock icon + "Upgrade to Pro" link
- Click on gated feature → tooltip with upgrade CTA linking to `/settings/billing`

### Step 3: Extract plan constants

**File:** `src/lib/config/plan-config.ts`

Extract product IDs from `auth.ts` and `billing-content.tsx` into a single source of truth:

```typescript
export const PLAN_PRODUCT_IDS = {
  free: "398f06f7-a6f6-4f65-80b6-62e38bd2825c",
  pro: "3662224a-d998-4a73-bf82-4957198d53ea",
  proYearly: "0be62924-d418-4dcc-8c8c-2b4929f76695",
} as const;

export const PRO_PRODUCT_IDS = [PLAN_PRODUCT_IDS.pro, PLAN_PRODUCT_IDS.proYearly];
```

Update `billing-content.tsx` (lines 57-60) to use these constants instead of inline IDs.

### Step 4: Wire up form settings gates

**File:** `src/components/form-builder/settings-content.tsx`

**Skills:** `no-use-effect` — ensure no effects are introduced.

Wrap Pro/BIZ toggles with `<FeatureGate>`:

- **Reform branding** (line 268): `<FeatureGate requiredPlan="pro">`
- **Data retention** (line 293): `<FeatureGate requiredPlan="biz">`
- **Respondent emails** (line 416): `<FeatureGate requiredPlan="pro">`

The `<FeatureGate>` disables the `<Switch>` and shows upgrade prompt. The existing `<Badge>` stays as-is for labeling.

### Step 5: Wire up customize sidebar gates

**File:** `src/components/ui/customize-sidebar.tsx`

**Skills:** `no-use-effect` — ensure no effects are introduced.

Replace the cosmetic `<ProBadge />` in `<SidebarSection action={...}>` with a functional gate. Two approaches:

**Option A (per-section gate):** Wrap each `<SidebarSection>` with `<FeatureGate>`:

```typescript
<FeatureGate requiredPlan="pro">
  <SidebarSection label="Layout" action={<ProBadge />}>
    ...
  </SidebarSection>
</FeatureGate>
```

**Option B (content gate):** Keep sections visible but disable all inputs inside. Preferred — users can see what they're missing.

Gate these sections (all Pro):

- Layout (line 410)
- Typography (line 470)
- Title (line 504)
- Colors (line 572)
- Custom CSS (line 589)

### Step 6: Wire up share/embed panel gates

**Files:**

- `src/components/form-builder/share-summary-sidebar.tsx`
- `src/components/form-builder/embed-config-panel.tsx`

Gate the "Pro Features" section and Custom Domain field.

### Step 7: Server-side validation

**File:** `src/routes/api/...` (form save endpoints)

**Skills:** `superpowers:brainstorming` — decide which features need server validation vs. client-only gates.

When a form is saved with Pro features enabled (e.g. branding=false, respondent emails=on), validate that the user actually has Pro. This prevents:

- API manipulation to bypass client gates
- Features staying enabled after a subscription expires

**Priority features for server validation:**

1. Branding removal (visible to form respondents)
2. Respondent emails (costs money to send)
3. Custom CSS (security surface)

Lower priority (client gate sufficient):

- Customize sidebar options (cosmetic, editor-only)
- Analytics (read-only)

### Step 8: Update billing page to use shared constants

**File:** `src/routes/_authenticated/-components/settings/billing-content.tsx`

Replace inline product ID checks (lines 57-60) with `useUserPlan()` hook.

---

## File Dependency Graph

```
src/lib/config/plan-config.ts          ← Step 3 (constants, no deps)
    ↓
src/hooks/use-user-plan.ts             ← Step 1 (hook, depends on plan-config + auth-client)
    ↓
src/components/ui/feature-gate.tsx     ← Step 2 (component, depends on use-user-plan)
    ↓
├── settings-content.tsx               ← Step 4
├── customize-sidebar.tsx              ← Step 5
├── share-summary-sidebar.tsx          ← Step 6
├── embed-config-panel.tsx             ← Step 6
├── billing-content.tsx                ← Step 8
└── API routes                         ← Step 7
```

## Execution Order

Steps 1-3 can be done in parallel (no deps on each other).
Steps 4-6 depend on Steps 1-3 and can be done in parallel with each other.
Step 7 depends on Step 3 (plan constants).
Step 8 depends on Step 1 (hook).

```
[Step 3: Constants] ──┐
[Step 1: Hook]     ───┼──→ [Steps 4,5,6: Wire UI gates] ──→ [Step 8: Billing cleanup]
[Step 2: Component] ──┘           ↓
                          [Step 7: Server validation]
```

## Skills to Use

| Step      | Skill                                | Why                                                     |
| --------- | ------------------------------------ | ------------------------------------------------------- |
| Step 2    | `superpowers:brainstorming`          | Decide upgrade UX pattern (tooltip vs popover vs modal) |
| Steps 4-6 | `no-use-effect`                      | Ensure gating logic uses derived state, not effects     |
| Step 7    | `superpowers:brainstorming`          | Decide which features need server-side enforcement      |
| After all | `superpowers:requesting-code-review` | Review the full implementation                          |
| After all | `/simplify`                          | Clean up any redundancy across the 10 gate points       |

## Testing Strategy

- Manually test with Polar sandbox: create a free account, verify all Pro features are disabled
- Switch to Pro plan, verify features unlock
- Downgrade back to free, verify features re-lock
- API test: try enabling Pro features via direct API call on free plan → should reject

## Out of Scope

- BIZ plan product ID (doesn't exist in Polar yet)
- Custom Domain implementation (just the gate, not the actual feature)
- Stripe migration (currently Polar only)
