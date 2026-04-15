# AI Form Generation — Streaming Structured Output Migration

**Date:** 2026-04-15
**Status:** Plan
**Branch:** TBD (recommend: `ai/stream-structured`)

## Goal

Replace the current `streamText` + tool-calling pipeline in `/api/ai/form-generate` with `streamObject` + a discriminated-union "ops" schema so that form fields, title, dividers, and theme updates **materialize in the UI as tokens stream** instead of appearing only after each tool-call completes.

## Non-goals (must not break)

- Inserting a single field at cursor position (⌘⇧K bubble insert)
- Whole-form generation from prompt
- Whole-form generation from image (theme extraction)
- Title-only generation via `setFormHeader`
- Page divider insertion via `addFormSection`
- Theme update via `setFormTheme`
- Rollback on stream error (`editor.tf.undo()` per inserted node)
- Concurrent stream prevention
- Select-and-edit (⌘J menu) in all three modes: `comment`, `edit`, `generate`
- Future hooks for banner/profile image generation (kept on separate image-gen path)

## Architecture

### Ops schema (shared between all AI features)

```ts
// src/lib/ai/ops-schema.ts  (new)
import { z } from "zod";

export const fieldTypeEnum = z.enum([
  "input",
  "email",
  "phone",
  "date",
  "number",
  "multiChoice",
  "ranking",
  "longText",
  "rating",
  "url",
]);

export const opSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set-header"),
    title: z.string().optional(),
    iconKeyword: z.string().optional(),
    coverColor: z.string().optional(),
  }),
  z.object({
    type: z.literal("add-field"),
    fieldType: fieldTypeEnum,
    label: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("add-section"),
    title: z.string(),
    level: z.enum(["h1", "h2", "h3"]).optional(),
  }),
  z.object({
    type: z.literal("set-theme"),
    tokens: z.record(z.string(), z.string()).optional(),
    font: z.string().optional(),
    radius: z.string().optional(),
  }),
  z.object({
    type: z.literal("replace-field"),
    label: z.string().optional(),
    fieldType: fieldTypeEnum.optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
  }),
]);

export const formGenSchema = z.object({ ops: z.array(opSchema) });
export type Op = z.infer<typeof opSchema>;
export type FormGenResult = z.infer<typeof formGenSchema>;
```

### Server route

```ts
// src/routes/api/ai/form-generate.ts  (rewritten)
import { streamObject } from "ai";
import { formGenSchema } from "@/lib/ai/ops-schema";

// POST handler
const result = streamObject({
  model, // same model selection as today
  schema: formGenSchema,
  system: FORM_GEN_SYSTEM_PROMPT, // reword from tool-calling → "emit ops"
  messages, // includes image parts as before
  onFinish: async ({ object }) => {
    /* analytics */
  },
});
return result.toTextStreamResponse();
```

Key server changes:

1. Replace `tools: { addFormBlock, addFormSection, setFormHeader, setFormTheme }` with single `schema: formGenSchema`.
2. Rewrite system prompt from "call these tools" to "emit an `ops` array of operations in order".
3. Keep image-input handling (data URL in messages) untouched.
4. Keep auth/rate-limit guards untouched.

### Client apply algorithm

```ts
// src/components/editor/hooks/use-form-gen-stream.ts  (new)
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { formGenSchema, type Op } from "@/lib/ai/ops-schema";

type Applied = { opIndex: number; path: number[]; kind: Op["type"] };

export function useFormGenStream(editor, formId, onError) {
  const appliedRef = useRef<Map<number, Applied>>(new Map());
  const insertPathRef = useRef<number[]>([]);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/ai/form-generate",
    schema: formGenSchema,
    onFinish: () => {
      /* no-op */
    },
    onError,
  });

  useEffect(() => {
    const ops = object?.ops ?? [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (!op) continue;
      const prev = appliedRef.current.get(i);
      if (!prev && isOpReady(op)) {
        const applied = applyOp(editor, op, insertPathRef, formId);
        if (applied) appliedRef.current.set(i, applied);
      } else if (prev && canLiveUpdate(op, prev)) {
        liveUpdateOp(editor, op, prev);
      }
    }
  }, [object]);

  // rollback on error
  useEffect(() => {
    if (!error) return;
    const undoCount = appliedRef.current.size;
    for (let i = 0; i < undoCount; i++) editor.tf.undo();
    appliedRef.current.clear();
  }, [error]);

  return { submit, stop, isLoading, error };
}
```

**`isOpReady(op)` per variant:**

- `set-header`: at least one of `title`/`iconKeyword`/`coverColor` is non-empty
- `add-field`: has `fieldType` AND `label.length > 0`
- `add-section`: has `title.length > 0`
- `set-theme`: has at least one theme property
- `replace-field`: has at least one replacement property

**`canLiveUpdate(op, prev)` rules:**

- `add-field`: allow updating `label`, `placeholder`, `required`. **Freeze** `fieldType`, `options` after first apply.
- `add-section`: allow `title`. Freeze `level`.
- `set-header`: allow all (header is a single node).
- `set-theme`: apply latest snapshot every tick.

### Node application (reuse existing builders)

`applyOp` delegates to existing builders — **no changes to `src/lib/editor/ai-form-nodes.ts`**:

```ts
function applyOp(editor, op, pathRef, formId): Applied | null {
  switch (op.type) {
    case "add-field": {
      const nodes = buildFormBlockNodes(op); // existing fn
      const path = [...pathRef.current];
      editor.tf.insertNodes(nodes, { at: path });
      pathRef.current = [path[0] + nodes.length];
      return { opIndex: -1, path, kind: "add-field" };
    }
    case "add-section": {
      const nodes = buildFormSectionNodes(op); // existing fn
      // same pattern
    }
    case "set-header":
      editor.tf.setNodes(headerUpdates(op), { at: [0] });
      return { opIndex: -1, path: [0], kind: "set-header" };
    case "set-theme":
      getFormListings().update(formId, (draft) => {
        draft.customization = { ...draft.customization, ...themePatch(op) };
      });
      return { opIndex: -1, path: [], kind: "set-theme" };
    case "replace-field": {
      // only valid in select-and-edit context; path comes from selection
      editor.tf.setNodes(fieldPatch(op), { at: pathRef.current });
      return { opIndex: -1, path: pathRef.current, kind: "replace-field" };
    }
  }
}
```

`liveUpdateOp` calls `editor.tf.setNodes` on the tracked `path` with the diff.

## File-by-file changes

### New files

| Path                                                 | Purpose                                       |
| ---------------------------------------------------- | --------------------------------------------- |
| `src/lib/ai/ops-schema.ts`                           | Zod schema + types for ops                    |
| `src/lib/ai/system-prompts.ts`                       | Extracted system prompt strings               |
| `src/components/editor/hooks/use-form-gen-stream.ts` | `useObject` wrapper with apply/rollback       |
| `src/lib/editor/apply-op.ts`                         | `applyOp` / `liveUpdateOp` / readiness guards |

### Rewritten

| Path                                                | Change                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/routes/api/ai/form-generate.ts`                | Drop tools; switch to `streamObject(schema: formGenSchema)`; rewrite system prompt |
| `src/components/editor/plugins/ai-form-gen-kit.tsx` | Replace `useChat` with `useFormGenStream`; bubble UI unchanged                     |

### New routes

| Path                           | Purpose                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/routes/api/ai/command.ts` | **Real** endpoint for ⌘J menu. `streamText` for prose edits; `streamObject(replace-field op)` for field rewrites |

### Unchanged

- `src/lib/editor/ai-form-nodes.ts` — node builders reused as-is
- `src/lib/editor/ai-icon-matcher.ts`
- `src/components/ui/ai-menu.tsx` — UI only; rewires to new command route
- TanStack DB collections — mutation surface unchanged

## Select-and-edit route (`/api/ai/command`)

The mocked `use-chat.ts` flow supports three modes: `comment`, `edit`, `generate`.

- **`comment`**: streams plain text → inserted as Plate suggestion mark. Use `streamText`.
- **`edit`** (prose): streams replacement text for selected range → replace in place with suggestion marks. Use `streamText`.
- **`edit`** (field): structural rewrite of a form field. Use `streamObject({ schema: z.object({ op: replaceFieldOp }) })` and apply via existing `applyOp`.
- **`generate`**: streams new block after selection. Use `streamText` for prose, `streamObject` for field insertion.

Route dispatches based on the `target` field (`"text" | "field"`) sent by the client.

## Rollback & concurrency behavior

Current behavior (preserved):

- One stream at a time. Bubble disables trigger while `isLoading`.
- On error: undo each applied node in LIFO order.
- On user cancel: keep applied ops (same as today).

New behavior added:

- **Live label text** appears token-by-token inside an already-inserted node. If stream errors mid-label, the partial label text is kept but node structure is undone — matching current UX when a tool call fails after args partially filled.

## Rollout

**Phase 1 — Infrastructure (no user-visible change)**

- [ ] Add `src/lib/ai/ops-schema.ts`
- [ ] Add `src/lib/ai/system-prompts.ts` (extract existing prompt text)
- [ ] Add `src/lib/editor/apply-op.ts`
- [ ] Unit tests for `isOpReady`, `applyOp` against mock editor

**Phase 2 — Server migration**

- [ ] Rewrite `src/routes/api/ai/form-generate.ts` to `streamObject`
- [ ] New system prompt: "emit ops in order" with few-shot examples
- [ ] Manual curl against route → verify valid ops stream

**Phase 3 — Client hook**

- [ ] Add `src/components/editor/hooks/use-form-gen-stream.ts`
- [ ] Rewrite `ai-form-gen-kit.tsx` to use the hook
- [ ] Parity tests: whole form, single field, image-theming, title-only, rollback

**Phase 4 — Select & edit**

- [ ] Implement `src/routes/api/ai/command.ts`
- [ ] Replace mock in `src/components/editor/use-chat.ts`
- [ ] Test all three modes + suggestion mark accept/reject

**Phase 5 — Cleanup**

- [ ] Delete old tool definitions if nothing references them
- [ ] Delete feature flag if used during rollout

**Phase 6 — Image generation (separate, not blocking)**

- [ ] `/api/ai/banner-image` — `experimental_generateImage`, streams progress state only
- [ ] `/api/ai/profile-icon` — same pattern
- [ ] Wire into `set-header.iconKeyword` → icon matcher (already exists) + new image generation as opt-in

## Open questions

1. **Model choice.** Does current GPT-4o-mini handle discriminated-union Zod schemas as fluently as it handles tools? Benchmark before Phase 2 ship. Anthropic Haiku/Sonnet handles unions well; can be fallback.
2. **Order of ops in model output.** System prompt must enforce: `set-header` first, then `add-field`/`add-section` in visual order, then `set-theme` last. Otherwise partial render looks wrong (theme flashes mid-insert).
3. **Mid-stream revisions.** If model emits `add-field` with `label: "Nm"` then later changes to `label: "Name"`, `liveUpdateOp` handles it. If it changes `fieldType` mid-stream, we freeze — but that may mean the final form doesn't match intent. Monitor in practice; if common, relax freeze with a diff-replace (remove old node, insert new).
4. **Schema size vs. latency.** Big union schemas push more tokens into the model context and can slow TTFT. If measurable, split into two endpoints: `/form-generate` (no `replace-field`) and `/field-edit` (only `replace-field`).

## Success criteria

- [ ] User types prompt → first field's label starts appearing within 500ms (today: wait for full tool call, ~2–4s).
- [ ] All six named features produce identical final output as today's tool-calling path (parity verified via golden-file tests).
- [ ] Rollback on error leaves editor in pre-stream state.
- [ ] No regression in image-to-theme generation.
- [ ] `/api/ai/command` replaces mock; ⌘J edit/generate/comment work end-to-end.
