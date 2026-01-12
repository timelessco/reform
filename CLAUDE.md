# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **API**: ORPC (type-safe RPC) with OpenAPI support
- **State**: TanStack Query + TanStack React DB (localStorage persistence)
- **UI**: Shadcn/Radix UI components + Tailwind CSS 4
- **Form Builder**: Plate.js rich text editor
- **Validation**: Zod 4

## Architecture

### File-Based Routing (`src/routes/`)
- `__root.tsx` - Root layout with providers
- `_authenticated/` - Protected route group requiring auth + verified email
- `api/auth/$.ts` - Better Auth handler (`/api/auth/*`)
- `api.rpc.$.ts` - ORPC RPC handler (`/api/rpc/*`)
- `api.$.ts` - OpenAPI/REST endpoint (`/api/*`)

### Key Directories
- `src/components/ui/` - Shadcn UI components
- `src/components/editor/` - Plate.js editor components
- `src/components/form-components/` - Form field rendering
- `src/lib/auth.ts` - Better Auth server config
- `src/lib/auth-client.ts` - Better Auth client with React Query
- `src/db/schema.ts` - Drizzle schema with relations
- `src/orpc/router/` - ORPC procedure definitions
- `src/services/` - Business logic services
- `src/hooks/` - React hooks for form builder logic

### Authentication Flow
- Routes in `_authenticated/` enforce `authMiddleware` (session + email verification)
- Email OTP: 6 digits, 5-minute expiry
- ORPC procedures receive `context.userId` from session

### ORPC Pattern
```typescript
// Define procedure in src/orpc/router/
export const myProcedure = os
  .input(z.object({ name: z.string() }))
  .handler(({ input, context }) => {
    // context.userId available from auth middleware
    return result;
  });

// Use in components
import { orpc } from "@/orpc/client";
const { data } = orpc.myProcedure.useQuery({ input: { name: "test" } });
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

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

Optional:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
VITE_SENTRY_DSN=...
```
