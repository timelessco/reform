# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.



## Build & Development Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000

# Build & Production
pnpm build            # Build for production
pnpm start            # Run production server from .output/server
pnpm preview          # Preview production build

# Testing
pnpm test             # Run Vitest tests

# Code Quality
pnpm lint             # Run Biome linter
pnpm format           # Format code with Biome
pnpm check            # Run Biome full check (lint + format)

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly to database
pnpm db:studio        # Open Drizzle Studio UI

# Shadcn Components
pnpm dlx shadcn@latest add <component>
```

## Tech Stack

- **Framework**: TanStack React Start (React 19 + SSR with Nitro server)
- **Routing**: TanStack Router with file-based routes
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth with email OTP, 2FA, and Google OAuth
- **Real-time Sync**: Electric for local-first real-time synchronization
- **State**: TanStack Query + TanStack React DB (localStorage persistence)
- **UI**: Shadcn/Radix UI components + Tailwind CSS 4
- **Form Builder**: Plate.js rich text editor with extensive plugin system
- **Validation**: Zod 4
## Directory Routes

Directories can be used to denote route hierarchy, which can be useful for organizing multiple routes into logical groups and also cutting down on the filename length for large groups of deeply nested routes.

See the example below:

| Filename                | Route Path                | Component Output                  |
| ----------------------- | ------------------------- | --------------------------------- |
| Ê¦ `__root.tsx`          |                           | `<Root>`                          |
| Ê¦ `index.tsx`           | `/` (exact)               | `<Root><RootIndex>`               |
| Ê¦ `about.tsx`           | `/about`                  | `<Root><About>`                   |
| Ê¦ `posts.tsx`           | `/posts`                  | `<Root><Posts>`                   |
| ðŸ“‚ `posts`              |                           |                                   |
| â”„ Ê¦ `index.tsx`         | `/posts` (exact)          | `<Root><Posts><PostsIndex>`       |
| â”„ Ê¦ `$postId.tsx`       | `/posts/$postId`          | `<Root><Posts><Post>`             |
| ðŸ“‚ `posts_`             |                           |                                   |
| â”„ ðŸ“‚ `$postId`          |                           |                                   |
| â”„ â”„ Ê¦ `edit.tsx`        | `/posts/$postId/edit`     | `<Root><EditPost>`                |
| Ê¦ `settings.tsx`        | `/settings`               | `<Root><Settings>`                |
| ðŸ“‚ `settings`           |                           | `<Root><Settings>`                |
| â”„ Ê¦ `profile.tsx`       | `/settings/profile`       | `<Root><Settings><Profile>`       |
| â”„ Ê¦ `notifications.tsx` | `/settings/notifications` | `<Root><Settings><Notifications>` |
| Ê¦ `_pathlessLayout.tsx` |                           | `<Root><PathlessLayout>`          |
| ðŸ“‚ `_pathlessLayout`    |                           |                                   |
| â”„ Ê¦ `route-a.tsx`       | `/route-a`                | `<Root><PathlessLayout><RouteA>`  |
| â”„ Ê¦ `route-b.tsx`       | `/route-b`                | `<Root><PathlessLayout><RouteB>`  |
| ðŸ“‚ `files`              |                           |                                   |
| â”„ Ê¦ `$.tsx`             | `/files/$`                | `<Root><Files>`                   |
| ðŸ“‚ `account`            |                           |                                   |
| â”„ Ê¦ `route.tsx`         | `/account`                | `<Root><Account>`                 |
| â”„ Ê¦ `overview.tsx`      | `/account/overview`       | `<Root><Account><Overview>`       |
## Architecture

### File-Based Routing (`src/routes/`)
- `__root.tsx` - Root layout with providers
- `index.tsx` - Home/landing page
- `create.tsx` - Form creation page
- `verify-email.tsx` - Email verification page
- `_authenticated/` - Protected route group requiring auth + verified email
  - `dashboard.tsx` - User dashboard
  - `settings/` - User settings (my-account, api-keys, billing, notifications)
  - `workspace/$workspaceId/` - Workspace management
    - `form-builder/$formId/` - Form editor with sub-pages (settings, submissions, insights, integrations, share)
- `api/auth/$.ts` - Better Auth handler (`/api/auth/*`)
- `api/electric.ts` - Electric real-time sync endpoint

### Key Directories
- `src/components/ui/` - Shadcn UI components (167 files)
- `src/components/editor/` - Plate.js editor components and plugins (65 files)
- `src/components/auth/` - Authentication dialogs and forms
- `src/components/form-components/` - Form field rendering
- `src/components/layout/` - Layout components (sidebar)
- `src/lib/` - Utilities and configuration
  - `auth.ts` - Better Auth server config
  - `auth-client.ts` - Better Auth client with React Query
  - `generate-zod-schema.ts` - Dynamic Zod schema from form content
  - `transform-plate-to-form.ts` - Converts Plate.js content to form data
  - `sync.ts` - Synchronization logic
  - `fn/` - Business logic functions (forms.ts, workspaces.ts, helpers.ts)
- `src/db/schema.ts` - Drizzle schema with relations
- `src/db-collections/` - TanStack React DB collections for client-side state
- `src/middleware/auth.ts` - Authentication middleware for protected routes
- `src/hooks/` - React hooks for form builder logic (14 hooks)
- `src/types/` - TypeScript type definitions
- `src/integrations/` - Provider integrations (TanStack Query)

### Authentication Flow
- Routes in `_authenticated/` enforce `authMiddleware` (session + email verification)
- Email OTP: 6 digits, 5-minute expiry
- Server functions access session via Better Auth helpers

### API Pattern
```typescript
// Server functions in src/lib/fn/
// Business logic for forms, workspaces, etc.
import { db } from "@/db";
import { forms } from "@/db/schema";

export async function getFormById(formId: string) {
  return db.query.forms.findFirst({
    where: eq(forms.id, formId),
  });
}

// Client-side state with TanStack React DB collections
// src/db-collections/form.collections.ts
import { collection } from "@tanstack/react-db";

export const formsCollection = collection({
  name: "forms",
  // Collection configuration
});
```

### Form Builder Data Flow
- Editor content stored as Plate.js `Value` (JSON array of nodes)
- Client persistence: TanStack React DB collections in localStorage
- Server persistence: PostgreSQL `forms` table with JSONB `content` and `settings`
- Zod schemas generated dynamically from form content via `src/lib/generate-zod-schema.ts`

## Sentry Integration

Import and wrap server functions for instrumentation:
```typescript
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.startSpan({ name: 'Operation description' }, async () => {
  // Server operation
});
```