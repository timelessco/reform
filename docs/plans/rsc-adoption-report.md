# React Server Components — Better Form Adoption Report

_Date: 2026-04-14 • Based on TanStack RSC blog (Apr 13 2026) + TanStack Start RSC docs + TanStack/router repo (btca: `tanstack-router`)_

## TL;DR

TanStack's RSC release is **deliberately non-opinionated** — RSCs are treated as **fetchable, cacheable, renderable data** (returned from `createServerFn` / route loaders), not as a framework-owned tree. There's no forced `app/` layout, no implicit `'use server'`, and a new primitive called **Composite Components** lets the _client_ own the tree while the server fills shells with data.

For Better Form, this is a **good fit for ~30% of the app** (public form pages, landing, custom-domain pages, docs/marketing). The authenticated dashboard + form editor is **explicitly NOT a good candidate** — it's a local-first TanStack DB app where the client owning the tree is the whole point.

Realistic bundle win on public routes: **~300–600 KB gzipped**, mainly by keeping Plate.js preview, katex, lowlight, and markdown renderers off the client for form renders that don't need them.

---

## 1. What just shipped (key concepts)

| Concept                     | Meaning for us                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RSCs as data**            | `renderServerComponent(<X/>)` returns a serializable payload you ship from a `createServerFn` / route `loader`. No framework magic.                                                         |
| **No `'use server'`**       | Start uses explicit **Server Functions** (which we already use). Only `'use client'` matters.                                                                                               |
| **Composite Components**    | Server renders a shell; client fills _named slots_ (`children`, render props). Slot contents are normal client components — **no `'use client'` needed** on them. The client owns the tree. |
| **Caching**                 | Server-component payloads are cacheable/invalidatable via `router.invalidate()`. Works with route loaders we already have.                                                                  |
| **Suspense + `<Deferred>`** | Route loaders can return a _bundle of promises_ for independent RSC fragments that stream in parallel.                                                                                      |
| **Requirements**            | React 19+, Vite 7+, add `@vitejs/plugin-rsc`, flip `tanstackStart({ rsc: { enabled: true } })`.                                                                                             |

TanStack's own measurements on tanstack.com: blog/docs pages dropped **~153 KB gzipped**, TBT 1200 ms → 260 ms. Interactive shell pages barely moved. That's the shape of the win.

---

## 2. Route classification (where RSC helps / hurts)

### ✅ Strong RSC candidates (content-heavy, mostly static)

| Route                  | File                              | Why it wins                                                                                                                           |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Public form view       | `src/routes/forms/$formId`        | Loader already fetches via Drizzle server-side. Page structure is static Plate.js render — ship HTML, keep only field-interaction JS. |
| i18n public form       | `src/routes/forms/$i8n/$formId`   | Same as above.                                                                                                                        |
| Short-link form        | `src/routes/f/$formId`            | Same.                                                                                                                                 |
| Custom domain resolver | `src/routes/$slug`                | Already uses `createServerFn` for domain→form lookup. Natural RSC boundary.                                                           |
| Landing page           | `src/routes/index.tsx`            | Currently lazy-loads the Plate landing-editor (~300 KB). RSC-render marketing shell, mount editor client-side only on interact.       |
| Custom-domain 404      | (already added in recent commits) | Pure static RSC.                                                                                                                      |

### ⚠️ Mixed — use Composite Components

| Route                              | Why mixed                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form fill-out submission           | Form _shape_ is static (server-rendered). _Field state / validation / submit_ must be client. Perfect Composite Component case: server ships the layout, client fills a `renderField` slot. |
| Blog / docs / help (if/when added) | Markdown + syntax highlighting on server; only interactive code-block copy buttons as client slots.                                                                                         |

### ❌ Keep client (do NOT RSC)

| Route                               | Blocker                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `_authenticated/dashboard`          | TanStack DB live queries (`useOrgForms`, `useOrgWorkspaces`) — local-first collections are the whole architecture. |
| `form-builder/$formId/edit`         | Plate.js `usePlateEditor()` + DnD-Kit + optimistic `localFormCollection.update()`. Fully interactive.              |
| `form-builder/$formId/submissions`  | Virtualized table + infinite scroll + TanStack Query mutations.                                                    |
| `_authenticated/settings/*`         | Forms + mutations + session-dependent UI everywhere.                                                               |
| `login/*`                           | Interactive mutations, social auth redirects.                                                                      |
| `/api/ai/form-generate` + consumers | `useChat` from AI SDK — client-only.                                                                               |

---

## 3. Concrete wins (ranked by ROI)

### Win #1 — Public form pages as RSC (high ROI, low risk)

**Today:** loader fetches form → client hydrates `FormPreviewFromPlate` with full Plate runtime. End-users opening a shared form download the entire editor preview bundle just to _read_ the form.

**With RSC:** server renders the form layout (headings, descriptions, field labels, Plate static content) → client only hydrates the actual **field input components** via a Composite Component slot.

**Estimated saving:** **~200–350 KB gzipped** per public form view. Biggest SEO + TTFB win in the app.

### Win #2 — Landing page shell (medium ROI)

`src/routes/index.tsx` + `-components/landing-editor.tsx` currently pulls the Plate bundle for a _demo_ editor. Server-render marketing copy + hero + feature cards as RSC; lazy-mount the demo editor only when the user scrolls/clicks into it.

**Estimated saving:** ~150–300 KB gzipped first-paint for marketing visitors.

### Win #3 — Move markdown/katex/lowlight rendering server-side (medium ROI)

These three ship to every route that could host form descriptions:

- `katex` — math rendering (already `noExternal` in vite SSR)
- `lowlight` — syntax highlighting
- `remark-*` / `hast-*` chain — markdown

On public form pages, render these to HTML on the server and ship zero JS for them. **Est: ~150–250 KB.**

### Win #4 — Custom-domain pages (low effort, since loader already exists)

`custom-domain-loader.ts` already does server work. A one-line change to make the rendered payload an RSC avoids the second client-side render pass.

---

## 4. Blockers / things to avoid

1. **Do not try to RSC the dashboard or editor.** The local-first TanStack DB model depends on the client owning writes + optimistic state. Composite Components can't fix this; you'd be fighting the architecture.
2. **Better Auth session.** `useSession()` is used widely. For RSC routes that need the user, read the session in the server function (we already have helpers) and pass as props.
3. **No `'use client'` directives exist today** — adopting RSC means classifying stateful components and adding the directive. Expect a day or two of hydration-mismatch whack-a-mole.
4. **Plate.js + DnD-Kit components** must stay client. The good news: our Vite `manualChunks` already isolates `@platejs/*` into an `editor` chunk, so pushing it out of public routes is mostly a route-level code-split problem, not a rewrite.
5. **Vite upgrade:** requires Vite 7+. Check current version in `package.json` before scheduling.

---

## 5. Recommended rollout

**Phase 1 — Enable RSC, migrate public form view only**

- Add `@vitejs/plugin-rsc`, flip `rsc.enabled: true`.
- Convert `src/routes/forms/$formId` loader to return an RSC payload for the static form body.
- Use a Composite Component so form inputs remain client.
- Measure: bundle size + Lighthouse for a known form URL.

**Phase 2 — Landing + custom-domain + short-link routes**

- Same pattern; low-risk since these already have server loaders.

**Phase 3 — Push markdown/katex/lowlight to server for public routes only**

- Replace client renders with server HTML injection via RSC.

**Explicitly out of scope:** authenticated dashboard, form builder, submissions, settings. Local-first stays local-first.

---

## 6. Open questions for you

1. Is public-form-page performance actually a pain point today, or are most views from authenticated users? (Changes ROI ranking.)
2. Is the landing page currently server-rendered via SSR already? If yes, the RSC win there is smaller than estimated.
3. Is SEO on public forms a product priority? (RSC helps first paint, not raw SEO if SSR is already on.)
4. Are you open to a Vite 7 bump if we're not there yet?

If the answer to (1) is "yes, public form loads are a bottleneck" — Phase 1 alone is worth shipping.

---

## 7. Addendum — findings from the TanStack/router repo (btca deep-dive)

After querying the actual `TanStack/router` repo via btca (`tanstack-router` resource), several concrete facts changed/sharpened the plan. These override the earlier sections where they conflict.

### 7.1 Three valid route↔RSC wiring models (pick per route)

The repo's e2e fixtures show three distinct integration patterns — not one canonical shape:

**A. Router-owned / direct loader** — loader returns the RSC payload directly.

```tsx
const getDirectLoaderRSC = createServerFn({ method: "GET" }).handler(async () => {
  return renderServerComponent(<div>SERVER RENDERED … </div>);
});
export const Route = createFileRoute("/rsc-direct-loader")({
  loader: () => getDirectLoaderRSC(),
  component: RscDirectLoaderComponent,
});
```

Simplest. Cache/invalidate via `router.invalidate()`. **Use for:** our public form view, custom-domain pages, landing shell.

**B. Loader-owned / bundle** — one server fn returns _multiple_ named RSCs.

```tsx
const getPageBundle = createServerFn().handler(async () => ({
  Header: await renderServerComponent(<Header />),
  Content: await renderServerComponent(<Content />),
  Footer: await renderServerComponent(<Footer />),
}));
```

Each `<CompositeComponent src={Header}>` gets its own slot. **Use for:** any page with multiple independent server regions — e.g., a public form page with header + body + footer that each have different cache lifetimes.

**C. Query-owned / coexistence with `useSuspenseQuery`** — this is the one we need for Better Form.

```tsx
const postQueryOptions = (postId: string) => ({
  queryKey: ["post", postId],
  structuralSharing: false, // ⚠️ REQUIRED — RSC values must NOT be merged
  queryFn: () => getPost({ data: { postId } }),
  staleTime: 5 * 60 * 1000,
});
// loader prefetches on server, component reads via useSuspenseQuery
```

**Use for:** any route that already uses TanStack Query (settings pages, submissions list, anything with background refetch).

### 7.2 Critical gotcha: `structuralSharing: false` is mandatory

If you wrap RSC payloads in TanStack Query, you **must** set `structuralSharing: false`. Query's default deep-merge on refetch will corrupt the Flight stream. Missing this will produce non-obvious render bugs after a refetch. Add an oxlint/ultracite note for the team.

### 7.3 Critical gotcha: RSCs are blind to client reactive stores

From the repo docs:

> RSCs render once on the server as Flight payloads. They have **no knowledge of client-side reactive stores** like TanStack DB collections. If you render a list inside an RSC and the client-side TanStack DB collection mutates optimistically, the RSC will show stale server-rendered data until the next invalidation cycle.

**Impact on Better Form:** our Phase-1 plan (public form view) is safe — that route doesn't use client collections. But any future attempt to RSC a page that reads from `useOrgForms` / `localFormCollection` is a trap. **Mitigation confirmed by the repo:** render the RSC as a "source-of-truth shell" and overlay optimistic/local data in client components inside Composite slots — never mix them in the same tree.

### 7.4 Critical gotcha: custom serialization adapters don't work inside RSCs yet

TanStack's `createSerializationAdapter` (`$RSC` key et al.) works at the transport layer but does **not** run inside a server component's render. If we pass non-primitive custom types (e.g., `Temporal` dates, Decimal.js, our own tagged types) as props **into** a server component, they will fail to serialize.

**Audit action:** before enabling RSC, grep our `createServerFn` handlers for any custom serializer registrations and verify the shapes passed into `renderServerComponent(...)` are plain JSON-safe.

### 7.5 Auth inside RSCs — use server middleware, not hooks

The repo's canonical auth pattern:

```tsx
const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await auth.getSession({ headers: request.headers });
  if (!session) throw redirect({ to: "/login" });
  return next({ context: { session } });
});
// then: createServerFn().middleware([authMiddleware]).handler(...)
```

`useSession()` does **not** work in an RSC. For Better Form, this means public form RSC routes will need a thin server-side `getSessionFromRequest()` helper rather than relying on `useSession()` from Better Auth's client. We already have Better Auth server primitives — this is a small plumbing change, not a rewrite.

### 7.6 Selective invalidation — not all refreshes are equal

Two levers:

- `router.invalidate()` — re-runs the whole route loader (heavy; rebuilds every RSC the loader returns).
- `queryClient.refetchQueries({ queryKey: [...] })` — re-runs only one RSC when it's stored in Query (lightweight).

**Rule:** for bundle pattern routes, prefer Query-owned caching so individual sections can refresh without tearing down the page.

### 7.7 Deferred/streaming pattern — confirmed useful for us

The `rsc-deferred` fixture returns a bundle of **un-awaited promises** for RSCs, consumed client-side via `React.use()` + `<Suspense>`. For Better Form, this fits:

- Public form page: ship the form shell immediately; defer the "recently submitted count" or any slow aggregate.
- Custom-domain page: defer branding lookups while rendering the form.

### 7.8 Plan adjustments

| Original plan item                                | Status after btca research                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1: migrate public form view                 | ✅ Unchanged — use **Model A (router-owned)**. Simplest.                                                                                                                                  |
| Phase 2: landing + custom-domain                  | ✅ Unchanged — **Model A**, plus **deferred bundle** for any slow branding/theme lookups.                                                                                                 |
| Phase 3: move markdown/katex/lowlight server-side | ✅ Unchanged. Confirmed safe — these are plain rendering, no client store coupling.                                                                                                       |
| (new) Phase 1.5: **serialization audit**          | ➕ ADD. Grep `createSerializationAdapter` and confirm no custom-typed props cross the RSC boundary. ~1 hour.                                                                              |
| (new) Phase 1.5: **auth plumbing**                | ➕ ADD. Create a `getServerSession(request)` helper for RSC routes. Replace `useSession()` on Phase-1 routes. Wire as `authMiddleware` on any RSC server fn that needs a user.            |
| (new) Lint rule                                   | ➕ ADD. Custom oxlint rule or doc note: any `queryOptions` that returns an RSC MUST set `structuralSharing: false`.                                                                       |
| (updated) Dashboard exclusion                     | 🔒 HARDENED. Repo explicitly confirms RSCs cannot see TanStack DB collections. Phase 3+ must not attempt dashboard RSC; use Composite-slot overlay if we ever need a server shell for it. |

### 7.9 Concrete next-action checklist (in order)

1. Confirm `vite@^7` is installed (or schedule the bump).
2. Add `@vitejs/plugin-rsc`; flip `tanstackStart({ rsc: { enabled: true } })` in `vite.config.ts`.
3. Grep `createSerializationAdapter` across the repo and list any custom-typed props that currently cross a `createServerFn` boundary.
4. Add `src/lib/server/get-server-session.ts` + `authMiddleware` for Better Auth.
5. Pilot **Model A** on `src/routes/forms/$formId` — measure bundle + Lighthouse before merging.
6. Only after measurements confirm wins: expand to `/f/$formId`, `/$slug`, and the landing shell.

---

_End of addendum. Sections 1–6 remain valid; section 7 is authoritative where it conflicts._
