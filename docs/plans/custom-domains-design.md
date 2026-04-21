# Custom Domains — Design Document

## Overview

Per-organization custom domains for serving public forms on the user's own domain (e.g. `forms.acme.com/contact-us`). Self-serve setup via settings dialog with Vercel Domains API integration.

## Decisions

| Decision            | Choice                                                           |
| ------------------- | ---------------------------------------------------------------- |
| Scope level         | Per-organization                                                 |
| Form identification | Slug preferred, UUID fallback (`/f/{uuid}`)                      |
| DNS setup           | Manual (user adds CNAME), auto-verified on page visit            |
| Multiple domains    | Yes, up to 5 per org                                             |
| Domain assignment   | Per-form, via share/embed dropdown                               |
| Unassigned forms    | Accessible on default app URL only                               |
| Root domain visit   | 404 "form not found" page                                        |
| Branding            | Auto-hidden on custom domain forms                               |
| Meta tags           | Per-domain: site title, favicon, OG image                        |
| File uploads        | Vercel Blob                                                      |
| Domain removal      | Clears assignment on all forms, forms fall back to app URL       |
| Settings UI         | New "Domains" tab in settings dialog                             |
| Vercel API          | Direct fetch calls, no SDK                                       |
| Access control      | Owner only for domain management; any editor for form assignment |
| Rate limit          | Max 5 domains per org                                            |

## URL Structure

### Custom domain

```
forms.acme.com/contact-us          → form by slug (root-level, clean)
forms.acme.com/f/{uuid}            → form by UUID (fallback)
forms.acme.com/                    → 404 page
```

### Default app URL (always works)

```
betterforms.com/forms/{uuid}       → unchanged, works regardless of custom domain
```

### Reserved paths on custom domains

`/f/`, `/api/`, `/health` — cannot be used as form slugs.

## Database Schema

### New table: `custom_domains`

| Column           | Type      | Notes                                        |
| ---------------- | --------- | -------------------------------------------- |
| `id`             | uuid      | PK                                           |
| `organizationId` | uuid      | FK → organization                            |
| `domain`         | text      | Unique, e.g. `forms.acme.com`                |
| `status`         | enum      | `pending`, `verified`, `failed`              |
| `vercelDomainId` | text      | Nullable, Vercel's reference                 |
| `siteTitle`      | text      | Nullable, e.g. "Acme" → "Contact Us \| Acme" |
| `faviconUrl`     | text      | Nullable, Vercel Blob URL                    |
| `ogImageUrl`     | text      | Nullable, Vercel Blob URL                    |
| `createdAt`      | timestamp |                                              |
| `updatedAt`      | timestamp |                                              |

### Modified table: `forms`

| Column           | Type | Notes                              |
| ---------------- | ---- | ---------------------------------- |
| `slug`           | text | Nullable, unique per org, URL-safe |
| `customDomainId` | uuid | Nullable, FK → custom_domains      |

### Constraints

- `custom_domains.domain` — globally unique
- `forms.slug` — unique per organization (composite unique on `slug` + org, enforced via query)
- Max 5 domains per org (enforced in API)

## Domain Lifecycle

```
User adds domain
    ↓
Call Vercel API: POST /v10/projects/{projectId}/domains
    ↓
Store in DB with status = "pending"
    ↓
Show DNS instructions: CNAME → cname.vercel-dns.com
    ↓
User configures DNS at their registrar (manual step)
    ↓
User revisits settings page
    ↓
Call Vercel API: GET /v9/projects/{projectId}/domains/{domain}
    ↓
Update status: "verified" or "failed"
    ↓
If verified → domain is live, forms accessible
```

### Removal flow

```
User clicks remove
    ↓
Call Vercel API: DELETE /v6/domains/{domain}
    ↓
Clear customDomainId on all forms using this domain
    ↓
Delete domain row from DB
```

## Server Middleware (Routing)

On every request, middleware runs before route matching:

```
1. Read Host header
2. If Host matches our app domain → normal routing, skip
3. Look up Host in custom_domains table (verified only)
4. If not found → 404
5. Parse path:
   - /f/{uuid} → look up form by UUID in the domain's org
   - /{slug}   → look up form by slug in the domain's org
   - /         → 404
6. Render public form page with domain's meta tags
```

## Branding & Meta Tags

When a form is served via custom domain:

- "Made with Reform" branding is automatically hidden
- `<title>` format: `{Form Title} | {Site Title}` (e.g. "Contact Us | Acme")
- Favicon: domain's uploaded favicon, falls back to app default
- OG image: domain's uploaded OG image, falls back to form's cover image if any

## UI Components

### Settings Dialog — Domains Tab

```
┌─────────────────────────────────────────────┐
│ Custom Domains                              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ forms.acme.com          ✓ Verified  [✕] │ │
│ │ survey.acme.com         ⏳ Pending  [✕] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [+ Add domain]                              │
│                                             │
│ ─── Domain Settings (forms.acme.com) ───    │
│ Site Title:  [Acme                    ]     │
│ Favicon:     [Upload]  acme-icon.png        │
│ OG Image:    [Upload]  acme-og.png          │
└─────────────────────────────────────────────┘
```

### Add Domain Flow

```
┌─────────────────────────────────────────────┐
│ Add Custom Domain                           │
│                                             │
│ Domain: [forms.acme.com              ]      │
│                                             │
│ [Add Domain]                                │
│                                             │
│ ─── DNS Configuration ───                   │
│ Add this CNAME record at your DNS provider: │
│                                             │
│ Type:  CNAME                                │
│ Name:  forms                                │
│ Value: cname.vercel-dns.com                 │
│                                             │
│ [Check Verification]                        │
└─────────────────────────────────────────────┘
```

### Form Share/Embed Panel — Domain Dropdown

```
┌─────────────────────────────────────┐
│ Custom Domain                       │
│ ┌─────────────────────────────────┐ │
│ │ forms.acme.com            ▼    │ │
│ │ ─────────────────────────────  │ │
│ │ ○ None (use default URL)       │ │
│ │ ● forms.acme.com               │ │
│ │ ○ survey.acme.com              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Form Slug                           │
│ [contact-us                      ]  │
│                                     │
│ URL: forms.acme.com/contact-us      │
└─────────────────────────────────────┘
```

## Vercel API Reference

### Environment Variables

```
VERCEL_TOKEN=         # Personal/team access token
VERCEL_PROJECT_ID=    # Project to register domains on
VERCEL_TEAM_ID=       # Optional, if using Vercel team
```

### Endpoints Used

```
POST   /v10/projects/{projectId}/domains   → Add domain
GET    /v9/projects/{projectId}/domains/{domain}  → Check verification
DELETE /v6/domains/{domain}                → Remove domain
```

### API Base URL

```
https://api.vercel.com
```

## Form Slug Rules

- Auto-generated from form title when assigning a custom domain
- URL-safe: lowercase, hyphens, no special chars
- Unique per organization
- Editable by user
- Required only when a custom domain is assigned
- Reserved slugs: `f`, `api`, `health`

## Access Control

| Action                                     | Required Role   |
| ------------------------------------------ | --------------- |
| Add/remove domain                          | Owner           |
| Configure domain meta (title, favicon, OG) | Owner           |
| Assign domain to form                      | Any form editor |
| Set/edit form slug                         | Any form editor |

## Implementation Skills

| Step                      | Skill                                                     |
| ------------------------- | --------------------------------------------------------- |
| Schema design             | —                                                         |
| Vercel API integration    | `superpowers:brainstorming` for error handling edge cases |
| Server middleware         | `no-use-effect` for any React parts                       |
| Settings UI (Domains tab) | `no-use-effect`, `frontend-design`                        |
| Form share panel updates  | `no-use-effect`                                           |
| File uploads (favicon/OG) | —                                                         |
| After implementation      | `superpowers:requesting-code-review`, `/simplify`         |
