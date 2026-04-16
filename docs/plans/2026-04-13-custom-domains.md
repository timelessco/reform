# Custom Domains Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let org owners add custom domains so their public forms are served at `forms.acme.com/contact-us` with custom branding.

**Architecture:** New `custom_domains` DB table + `slug`/`customDomainId` fields on forms. Server middleware reads `Host` header to route custom domain requests. Vercel Domains API for domain registration/verification. Settings dialog "Domains" tab for management. Form share panel dropdown for domain assignment.

**Tech Stack:** Drizzle ORM (Postgres), TanStack Start (server functions + file routes), Vercel Domains API, Vercel Blob (favicon/OG uploads), React Query, sonner (toasts)

---

## Task 1: Database Schema — `custom_domains` table + form fields

**Files:**

- Modify: `src/db/schema.ts`

**Step 1: Add `custom_domains` table and new form fields**

Add after the existing `forms` table definition in `src/db/schema.ts`:

```typescript
export const customDomains = pgTable(
  "custom_domains",
  {
    id: text().primaryKey(),
    organizationId: text().notNull(),
    domain: text().notNull().unique(),
    status: text().notNull().default("pending"),
    vercelDomainId: text(),
    siteTitle: text(),
    faviconUrl: text(),
    ogImageUrl: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("custom_domains_org_idx").on(t.organizationId),
    index("custom_domains_domain_idx").on(t.domain),
  ],
);
```

Add two columns to the existing `forms` table:

```typescript
slug: text(),
customDomainId: text(),
```

Add to the `formsRelations` section:

```typescript
customDomain: one(customDomains, {
  from: forms.customDomainId,
  to: customDomains.id,
}),
```

Add relations for `customDomains`:

```typescript
export const customDomainsRelations = defineRelations(schema, ({ customDomains }) => ({
  organization: one(organization, {
    from: customDomains.organizationId,
    to: organization.id,
  }),
}));
```

Export zod schema:

```typescript
export const CustomDomainZod = createSelectSchema(customDomains);
```

**Step 2: Generate and run migration**

Run: `bun run db:generate`
Run: `bun run db:push` (for dev) or `bun run db:migrate` (for prod)

**Step 3: Commit**

```
feat(db): add custom_domains table and slug/customDomainId fields on forms
```

---

## Task 2: Plan constants and Vercel API client

**Files:**

- Create: `src/lib/config/plan-config.ts`
- Create: `src/lib/vercel-domains.ts`

**Step 1: Create plan config with domain limits**

```typescript
// src/lib/config/plan-config.ts
export const PLAN_PRODUCT_IDS = {
  free: "398f06f7-a6f6-4f65-80b6-62e38bd2825c",
  pro: "3662224a-d998-4a73-bf82-4957198d53ea",
  proYearly: "0be62924-d418-4dcc-8c8c-2b4929f76695",
} as const;

export const PRO_PRODUCT_IDS = [PLAN_PRODUCT_IDS.pro, PLAN_PRODUCT_IDS.proYearly];

export const DOMAIN_LIMITS = {
  maxDomainsPerOrg: 5,
} as const;

export const RESERVED_SLUGS = new Set(["f", "api", "health"]);
```

**Step 2: Create Vercel Domains API client**

```typescript
// src/lib/vercel-domains.ts
const VERCEL_API = "https://api.vercel.com";

const vercelHeaders = () => ({
  Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  "Content-Type": "application/json",
});

const teamQuery = () => (process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "");

export const vercelDomains = {
  async add(domain: string): Promise<{ domain: string; verified: boolean }> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/domains${teamQuery()}`, {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: domain }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to add domain to Vercel");
    }
    return res.json();
  },

  async check(domain: string): Promise<{
    verified: boolean;
    verification?: { type: string; domain: string; value: string }[];
  }> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`,
      { headers: vercelHeaders() },
    );
    if (!res.ok) {
      throw new Error("Failed to check domain status");
    }
    return res.json();
  },

  async remove(domain: string): Promise<void> {
    const res = await fetch(`${VERCEL_API}/v6/domains/${domain}${teamQuery()}`, {
      method: "DELETE",
      headers: vercelHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to remove domain from Vercel");
    }
  },
};
```

**Step 3: Commit**

```
feat(domains): add plan config constants and Vercel Domains API client
```

---

## Task 3: Server functions for domain CRUD

**Files:**

- Create: `src/lib/server-fn/custom-domains.ts`

**Step 1: Create domain server functions**

Follow the pattern from `src/lib/server-fn/forms.ts` — use `createServerFn` with `authMiddleware`.

Functions needed:

1. **`listOrgDomains`** — List all domains for the user's active org
2. **`addDomain`** — Validate limit (5), call Vercel API, insert into DB
3. **`removeDomain`** — Call Vercel API, clear `customDomainId` on forms, delete from DB
4. **`checkDomainStatus`** — Call Vercel API, update status in DB, return result
5. **`updateDomainMeta`** — Update siteTitle, faviconUrl, ogImageUrl
6. **`getDomainByHost`** — Look up a verified domain by hostname (for middleware)

Each function should:

- Use `authMiddleware` for auth
- Validate input with zod
- Check org ownership before mutations
- Check `role === "owner"` for add/remove/update (not for list/getDomainByHost)

Query options to export:

```typescript
export const orgDomainsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: ["org-domains", orgId],
    queryFn: () => listOrgDomains({ data: { orgId } }),
    staleTime: 1000 * 60 * 5,
  });
```

**Step 2: Commit**

```
feat(domains): add server functions for domain CRUD and verification
```

---

## Task 4: Server functions for form slug management

**Files:**

- Modify: `src/lib/server-fn/forms.ts`

**Step 1: Add slug and domain assignment functions**

Add to existing `forms.ts`:

1. **`updateFormSlug`** — Validate slug format (lowercase, hyphens, no special chars), check uniqueness within org, check against `RESERVED_SLUGS`, update `forms.slug`
2. **`assignFormDomain`** — Set `customDomainId` on a form, auto-generate slug from title if none exists

Slug validation:

```typescript
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
```

**Step 2: Commit**

```
feat(domains): add form slug and domain assignment server functions
```

---

## Task 5: Domain routing middleware

**Files:**

- Create: `src/lib/middleware/custom-domain.ts`
- Modify: `src/routes/forms/$formId.tsx` (add slug-based lookup)
- Create: `src/routes/$slug.tsx` (catch-all for custom domain slugs)

**Step 1: Create domain resolution middleware**

This is the core routing logic. On every request:

1. Read `Host` header
2. Skip if it matches the app domain (localhost, betterforms.com, \*.vercel.app)
3. Look up `custom_domains` table for a verified domain matching the host
4. If found, store the domain info in request context for downstream routes

Reference: `src/lib/auth/middleware.ts` for the middleware pattern.

**Step 2: Create custom domain form routes**

Create `src/routes/$slug.tsx` — catches `forms.acme.com/contact-us`:

- Only activates when request comes from a custom domain (check context from middleware)
- Looks up form by slug within the domain's org
- Falls back to 404 if not found
- Sets meta tags from domain config (siteTitle, faviconUrl, ogImageUrl)
- Hides branding automatically

Create `src/routes/f/$formId.tsx` — catches `forms.acme.com/f/{uuid}`:

- Same as above but looks up by UUID instead of slug
- Only activates on custom domain requests

**Step 3: Update meta tags for custom domain forms**

In the form route's `head` function, check if domain meta exists:

```typescript
head: ({ loaderData }) => ({
  meta: [
    {
      title: loaderData.domainMeta
        ? `${loaderData.form.title} | ${loaderData.domainMeta.siteTitle}`
        : `${loaderData.form.title} | ${APP_NAME}`,
    },
  ],
  links: loaderData.domainMeta?.faviconUrl
    ? [{ rel: "icon", href: loaderData.domainMeta.faviconUrl }]
    : [],
});
```

**Step 4: Commit**

```
feat(domains): add custom domain routing middleware and form routes
```

---

## Task 6: Settings dialog — Domains tab (icon + tab registration)

**Files:**

- Modify: `src/hooks/use-settings-dialog.ts` — add `"domains"` to `SettingsTab` union
- Modify: `src/components/ui/icons.tsx` — add `GlobeIcon`
- Modify: `src/routes/_authenticated/-components/settings/settings-dialog.tsx` — add tab

**Step 1: Add "domains" to SettingsTab type**

In `src/hooks/use-settings-dialog.ts`, update the type:

```typescript
type SettingsTab = "account" | "members" | "billing" | "api-keys" | "domains";
```

**Step 2: Add GlobeIcon**

In `src/components/ui/icons.tsx`, add:

```typescript
export const GlobeIcon = createConsistentLucideIcon(LucideGlobe);
```

Import `Globe as LucideGlobe` from `lucide-react`.

**Step 3: Register the tab in settings dialog**

In `settings-dialog.tsx`:

Add to `navItems`:

```typescript
{ key: "domains", label: "Domains", icon: GlobeIcon },
```

Add to `tabTitles`:

```typescript
domains: "Custom Domains",
```

Add to `TabContent` switch:

```typescript
case "domains":
  return <DomainsContent />;
```

Import `DomainsContent` (created in next task).

**Step 4: Commit**

```
feat(domains): register Domains tab in settings dialog
```

---

## Task 7: Settings dialog — DomainsContent component

**Files:**

- Create: `src/routes/_authenticated/-components/settings/domains-content.tsx`

**Step 1: Build the DomainsContent component**

**Skills:** `no-use-effect`, `frontend-design:frontend-design`

Follow the pattern from `api-keys-content.tsx`. The component should have:

**Domain list section:**

- Query `orgDomainsQueryOptions` to list domains
- Each domain row shows: domain name, status badge (Pending/Verified/Failed), remove button
- Status badge colors: pending=yellow, verified=green, failed=red
- "Check status" button next to pending domains (calls `checkDomainStatus`)

**Add domain section:**

- Input field for domain name
- "Add Domain" button
- On submit: validate format, call `addDomain` mutation, show DNS instructions
- Show limit: "X of 5 domains used"

**DNS instructions (shown after adding):**

- Type: CNAME
- Name: extracted subdomain from input
- Value: `cname.vercel-dns.com`
- Copy button for the value

**Domain meta config (shown for selected/verified domain):**

- Site title input
- Favicon upload (Vercel Blob via existing upload pattern)
- OG image upload (Vercel Blob)
- Save button → calls `updateDomainMeta` mutation

**Access control:**

- Check if user is org owner
- If not owner, show read-only view with message "Only the org owner can manage domains"

**Step 2: Commit**

```
feat(domains): add DomainsContent settings component with full CRUD
```

---

## Task 8: Form share panel — domain dropdown and slug input

**Files:**

- Modify: `src/components/form-builder/embed-config-panel.tsx`
- Modify: `src/components/form-builder/share-summary-sidebar.tsx`

**Step 1: Replace hardcoded Custom Domain select**

In `embed-config-panel.tsx`, replace the disabled Select (lines 488-495) with:

- A `Select` dropdown listing verified domains from the org + "None (default URL)" option
- When a domain is selected, show a slug input field below it
- Auto-generate slug from form title if empty
- Preview the full URL: `{domain}/{slug}`
- Save domain assignment via `assignFormDomain` mutation
- Save slug via `updateFormSlug` mutation

The domain list should be queried via `orgDomainsQueryOptions`.

**Step 2: Update share URL generation**

In `embed-code-dialog.tsx` (line 53-67), update `baseUrl` to use custom domain if assigned:

```typescript
const baseUrl = form.customDomain
  ? `https://${form.customDomain.domain}/${form.slug}`
  : `${window.location.origin}/forms/${formId}`;
```

**Step 3: Commit**

```
feat(domains): add domain dropdown and slug input to form share panel
```

---

## Task 9: Public form route — custom domain 404 page

**Files:**

- Create: `src/routes/_custom-domain/404.tsx` (or handle in middleware)

**Step 1: Create a clean 404 page for custom domains**

When someone visits `forms.acme.com/` or `forms.acme.com/nonexistent-slug`:

- Show a minimal "Form not found" page
- No Reform branding (it's on a custom domain)
- Use the domain's favicon if available

This can be a simple component rendered by the middleware catch-all when no form matches.

**Step 2: Commit**

```
feat(domains): add custom domain 404 page
```

---

## Task 10: Environment variables and documentation

**Files:**

- Modify: `.env.example`

**Step 1: Add Vercel API env vars to `.env.example`**

```
# Custom Domains (Vercel API)
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

**Step 2: Commit**

```
docs: add Vercel domain API env vars to .env.example
```

---

## Task 11: Simplify and review

**Skills:** `/simplify`, `superpowers:requesting-code-review`

**Step 1: Run `/simplify`** on all changed files
**Step 2: Run code review** to check for missed edge cases
**Step 3: Final commit and push**

---

## Task Dependency Graph

```
[Task 1: DB Schema] ─────────┐
                              │
[Task 2: Constants + API] ────┼──→ [Task 3: Domain CRUD] ──→ [Task 7: Settings UI]
                              │         ↓
                              │    [Task 4: Slug mgmt] ──→ [Task 8: Share panel]
                              │
                              └──→ [Task 5: Middleware] ──→ [Task 9: 404 page]

[Task 6: Tab registration] ──→ [Task 7: Settings UI]

[Task 10: Env vars] ── independent

[Task 11: Review] ── after all
```

**Parallelizable groups:**

- Wave 1: Tasks 1, 2, 6, 10 (no deps)
- Wave 2: Tasks 3, 4, 5 (depend on Wave 1)
- Wave 3: Tasks 7, 8, 9 (depend on Wave 2)
- Wave 4: Task 11 (final)

## Environment Variables Needed

```
VERCEL_TOKEN=           # Vercel access token (Settings → Tokens)
VERCEL_PROJECT_ID=      # Project ID (Settings → General → Project ID)
VERCEL_TEAM_ID=         # Team ID if using Vercel team (optional)
```
