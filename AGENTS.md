# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-14 15:09:29 IST
**Commit:** 4931da9 chore: remove electic binding
**Branch:** main

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.


## OVERVIEW

Form builder with Local-First architecture. TanStack Start (React 19 + Nitro SSR), Plate.js rich text editor, Drizzle/PostgreSQL, Better Auth (OTP/2FA), ORPC type-safe RPC.

## STRUCTURE

```
./
├── src/
│   ├── components/
│   │   ├── ui/              # 166 files - Shadcn/Radix UI
│   │   ├── editor/          # Plate.js editor impl
│   │   │   └── plugins/     # 59 files - custom plugins
│   │   ├── auth/            # Auth components
│   │   ├── form-components/ # Form field rendering
│   │   └── file-upload/     # Upload components
│   ├── orpc/                # Type-safe RPC router + client
│   ├── routes/              # TanStack Router file-based
│   ├── hooks/               # React hooks for form builder
│   ├── lib/                 # Auth, utils, integrations
│   ├── services/            # Business logic services
│   ├── db/                  # Drizzle schema + connection
│   ├── db-collections/      # IndexedDB (TanStack React DB)
│   └── integrations/        # TanStack Query setup
├── drizzle/                 # Drizzle migrations
└── .output/                 # Nitro production build
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add UI component | `src/components/ui/` | Shadcn pattern, import from `@/components/ui/*` |
| Editor plugins | `src/components/editor/plugins/` | Plate.js custom plugins |
| Form logic hooks | `src/hooks/` | `useForm`, `useEditor` hooks |
| Auth integration | `src/lib/auth.ts` + `auth-client.ts` | Better Auth server + client |
| API procedures | `src/orpc/router/` | ORPC procedure definitions |
| Database schema | `src/db/schema.ts` | Drizzle tables + relations |
| Local persistence | `src/db-collections/` | IndexedDB via TanStack React DB |
| Route handlers | `src/routes/` | File-based routes, `.gen.ts` auto-generated |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `router.tsx` | file | `src/` | App bootstrap, TanStack Router instance |
| `__root.tsx` | file | `src/routes/` | Root layout, HTML shell, providers |
| `routeTree.gen.ts` | file | `src/` | Auto-generated route hierarchy |
| `authMiddleware` | func | `src/middleware/` | Session + email verification guard |
| `editorDocCollection` | obj | `src/db-collections/` | IndexedDB for form drafts |
| `orpc` | obj | `src/orpc/` | Type-safe RPC client + procedures |

## CONVENTIONS

- **Linting**: Biome (tabs, double quotes). Run `pnpm check`.
- **Path alias**: `@/*` maps to `src/*`.
- **Generated files**: Never edit `routeTree.gen.ts` - overwritten by TanStack Router.
- **Polyfills**: `src/polyfill.ts` imported in server routes for Node 18 compat.
- **Tailwind 4**: Config in `src/styles.css` with OKLCH colors.
- **DB migrations**: `drizzle.config.ts` + `drizzle/` directory.

## ANTI-PATTERNS (THIS PROJECT)

- **`src/components/editor/settings-dialog.tsx`**: DEMO ONLY, DO NOT USE IN PRODUCTION.
- **Type coercion**: `as any` used in `src/components/editor/transforms.ts` for Plate.js nodes.
- **Non-null assertions**: `process.env.DATABASE_URL!` in `src/db/index.ts` - crashes if missing.
- **Magic tailwind classes**: `!` modifier used for CSS specificity overrides.
- **Polyfill injection**: `globalThis.File = File as any` in `src/polyfill.ts` - brittle.

## COMMANDS

```bash
# Dev & Build
pnpm dev              # Vite dev server (port 3000)
pnpm build            # Production build to .output/
pnpm start            # Run .output/server/index.mjs

# Code Quality
pnpm check            # Biome lint + format
pnpm lint             # Biome only
pnpm format           # Biome format

# Database
pnpm db:generate      # Create migration
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly
pnpm db:studio        # Open Drizzle Studio

# Testing
pnpm test             # Run Vitest
```

## NOTES

- **Local-First**: Forms edited in browser, saved to IndexedDB first via `editorDocCollection`.
- **Server Sync**: ORPC mutations sync local drafts to PostgreSQL.
- **Auth Flow**: Routes in `_authenticated/` enforce `authMiddleware` (session + verified email).
- **Cursor Integration**: `vite.config.ts` has `cursor -g` devtools integration.
- **MCP Config**: `opencode.json` for remote MCP servers (better-auth).
