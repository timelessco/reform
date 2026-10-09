# Reform

Reform is a TanStack Start (Router + Vite) + React 19 app with TanStack DB collections, Drizzle ORM, Better Auth, Polar billing, the Plate.js editor, and the AI SDK.

## Quick Reference

- **Install**: `pnpm install` (`--frozen-lockfile` in CI)
- **Format / fix**: `pnpm fix` (oxfmt, then oxlint `--fix`)
- **Check**: `pnpm run check` (oxfmt `--check`, then oxlint + knip)
- **Typecheck**: `pnpm exec tsc --noEmit` (the `pnpm typecheck` script runs oxlint's type-check, not tsc)
- **Tests**: `pnpm run test` (Vitest); single file: `pnpm exec vitest run path/to/file.test.ts`
- **Dev server**: `pnpm dev` (`pnpm dev:auto` picks a free port)
- **Run TS scripts**: `pnpm exec tsx scripts/<name>.ts`

## TanStack Start / Router

- File-based routes under `src/routes/`; `src/routeTree.gen.ts` is generated — never edit by hand.
- Backend logic goes in server functions (`createServerFn`), not ad-hoc API routes.
- Reach for route loaders + `staleTime` before client-side fetching.
- Use typed `Link` and `useNavigate()` from `@tanstack/react-router`.
- For routing patterns (auth gates, search params, code splitting, not-found), load the matching skill file listed in `.claude/CLAUDE.md`.

### Prefetching into the query cache

A route that warms the cache declares its query options once, in the route's `context:` option. The loader ensures them off `context`, and the component subscribes via `Route.useRouteContext()`. Never call a `*QueryOptions(...)` factory a second time inside the same route. Reconstructing options can let the component's query key drift from the loader's key and cause a waterfall. `src/test/route-query-prefetch.test.ts` checks that loaders use the keys published by route context. Component subscriptions require review.

- Declare `context:` **before** `beforeLoad:` in the route object. Declared after, TypeScript never infers it and the loader's `context` silently loses the route's own keys.
- A search param that feeds a query key must also go in `loaderDeps`, and reach the options through `context: ({ deps }) => ...`. Params that only filter already-loaded data client-side (`?q=`, `?category=`) stay out of `loaderDeps` so they don't re-run the loader.

## TanStack DB / Drizzle

- Client state lives in query-based collections under `src/collections/` and `src/db/`; for writes and reads, load the `mutations-optimistic` and `live-queries` skills listed in `.claude/CLAUDE.md`.
- DB schema in `src/db/`; inspect with `pnpm db:studio`.
- A query key that two modules must agree on (a loader's prefetch and the collection reading it back) lives in `src/lib/query-keys.ts`, never as a literal on both sides.
- Do NOT run `db:generate` / `db:migrate` / `db:push` — migration tracking has drifted from `schema.ts`, and `db:push` wants to DROP non-empty tables. Apply additive, idempotent DDL via a tsx script against `DIRECT_URL` instead.

## Design-system lint (@shadcn/lint)

Oxlint runs `@shadcn/lint` (JS plugin) with all six rules at error: `no-inline-styles`, `no-raw-colors`, `no-arbitrary-values` (layout allowed), `no-unknown-classes`, `require-static-classes`, `no-restyle` (layout allowed). Utilities exist only for `@theme`-exposed semantic tokens in `src/styles/styles.css`; the `--color-gray-*`/blacks/whites scales are plain CSS vars with no utilities — reference them as `var(--color-*)`.

- Components own their appearance: `no-restyle` / `no-arbitrary-values` / `require-static-classes` are off inside `src/components/ui/**`. `no-raw-colors` and `no-inline-styles` stay on there.
- `no-inline-styles` is off in `src/lib/og/**` (Satori OG images accept only inline styles).
- `no-unknown-classes` allows Plate runtime classes (`slate-*`) and the `ignore-click-outside/toolbar` marker.
- `no-restyle` uses per-component contracts blessing current idioms (one `Icon$` contract plus `^Name$` per component). A component with no contract gets the strict default (layout only) — when you restyle a new component with appearance classes, add a contract instead of disabling the rule.
- Dynamic values go through CSS custom properties only: `style={{ "--x": v }}` plus `X-(--x)` variable-shorthand classes (identical output to `X-[var(--x)]`, and the rule passes the shorthand).
- Line disables need a `-- reason` and must stay short (oxfmt wraps long comments and breaks `next-line`): `//` between props or in JS, `{/* */}` in JSX-children position.

The vendored anti-slop rules in `tools/oxlint/anti-slop/` run alongside the design-system rules. Rules with existing violations remain warnings during migration; rules already satisfied by the codebase run as errors.

## Agent skills

- **Issue tracker** — GitHub Issues on `timelessco/reform` via the `gh` CLI. See `docs/agents/issue-tracker.md`.
- **Triage labels** — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.
- **Domain docs** — single-context (`CONTEXT.md` and `docs/adr/` at root, created lazily). See `docs/agents/domain.md`.
- **unslop** — cut AI tells from any writing. Must always apply when writing or editing prose (docs, PR descriptions, commit messages, comments). Loaded from `~/.agents/skills/unslop`; symlinked into `.agents/skills/` and `.claude/skills/` per machine.
