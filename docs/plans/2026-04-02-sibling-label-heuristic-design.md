# Sibling Label Heuristic Design

## Problem

Labels in the form editor are currently a dedicated `formLabel` node type. When users use "Turn into" to convert a label to a heading or paragraph, the label association breaks because the preview transformer only recognizes `formLabel` nodes. This causes:

- The input to become standalone and get skipped or show a fallback "input" label
- The `required` property (stored on `formLabel`) to be lost
- Users lose control over label styling (can't use h1 for one label and h3 for another)

## Design

### 1. Keep `formLabel` as Default

New fields still insert a `formLabel` + input node pair. `formLabel` acts as a styled default that users can override via "Turn into."

### 2. Move `required` to the Input Node

**Before:** `formLabel.required = true`
**After:** `formInput.required = true` (and all other input types: `formTextarea`, `formEmail`, etc.)

Rationale: It's the input that's required, not the label. This also means `required` survives if the label is deleted or converted.

### 3. Transformer Heuristic: Input Looks Back

The preview transformer in `transform-plate-for-preview.ts` changes from "label peeks forward at input" to "input looks back at preceding sibling."

**Allowed label types:** `formLabel`, `p`, `h1`, `h2`, `h3`, `blockquote`

**Algorithm:**

```
for each node at index i:
  if node is a form input type:
    prev = nodes[i - 1]
    if prev.type is in ALLOWED_LABEL_TYPES:
      label = extractTextContent(prev.children)
      required = node.required
      create FieldSegment with label, required, fieldType from node
      mark prev as consumed (skip in static buffer)
    else:
      create FieldSegment with label = "Untitled Field"
```

This replaces the current `formLabel`-driven switch case. The `formLabel` case in the switch becomes just another entry in the allowed types set.

### 4. Asterisk Badge Decorator

A wrapper/decorator component detects "is the next sibling a form input?" and injects the required asterisk badge onto any qualifying label node.

**Behavior:**

- Always visible in the editor on any node whose next sibling is a form input
- Acts as a toggle button:
  - **Red asterisk** → input is required
  - **Muted/default color asterisk** → input is not required
- Reads and writes `required` on the **sibling input node**, not the label node
- Works on all allowed label types: `formLabel`, `p`, `h1`–`h3`, `blockquote`

**Implementation approach:** A single Plate plugin decorator or React wrapper that:

1. Checks if `nodes[path + 1]` is a form input type
2. If yes, renders the asterisk badge absolutely positioned (top-right of the label block)
3. On click, toggles `required` on the input node at `path + 1`

This keeps badge logic in one place — individual element components (HeadingElement, ParagraphElement, etc.) don't need modification.

### 5. No "Turn Into" Menu Restrictions

All block types remain available in the "Turn into" menu. If a user converts a label to a non-allowed type (code block, list), the label association silently breaks and the input gets "Untitled Field" in preview. This respects user intent and avoids confusing restrictions.

## Files to Change

| File                                                | Change                                                          |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/transform-plate-for-preview.ts`            | Replace `formLabel` switch case with input-looks-back heuristic |
| `src/components/ui/form-label-node.tsx`             | Remove `required` badge rendering (moved to decorator)          |
| `src/components/editor/plugins/form-blocks-kit.tsx` | Add decorator plugin for asterisk badge                         |
| `src/components/ui/block-context-menu.tsx`          | Update Required toggle to write to input node                   |
| All form input element components                   | Support `required` prop on node                                 |
| `src/lib/transform-plate-to-form.ts`                | Read `required` from input node instead of label node           |

## Allowed Label Types Constant

```typescript
const ALLOWED_LABEL_TYPES = new Set(["formLabel", "p", "h1", "h2", "h3", "blockquote"]);
```

## Edge Cases

- **No preceding sibling:** Input at index 0 → label = "Untitled Field"
- **Preceding sibling is another input:** No label association → "Untitled Field"
- **Preceding sibling is a non-allowed type:** No label association → "Untitled Field"
- **Label node deleted:** Input becomes standalone → "Untitled Field"
- **Multiple inputs after one label:** Only the first input claims the label; subsequent ones get "Untitled Field"
- **Option-based fields (formOptionItem, formMultiSelectInput):** Same heuristic applies — look back from the first option/multi-select node to find the label

## Migration

Existing documents with `formLabel` nodes continue working — `formLabel` is in the allowed types set. The `required` property migration:

- Read `required` from both `formLabel.required` and `inputNode.required` during a transition period
- New writes always go to the input node
