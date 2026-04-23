---
name: adding-form-field-types
description: Use when adding new form field types to the Plate.js editor, such as email, phone, date picker, file upload, multiple choice, rating, signature, or any custom input. Covers text-like, void, and compound field patterns across 10 touch points.
---

# Adding Form Field Types

## Overview

Adding a new field type to the form builder requires changes across **10 touch points**. Every field follows the **label + input sibling** pattern — a `formLabel` block above, and the field element below. There are three categories of fields, each with slightly different plugin configurations.

## Field Categories

| Category      | Fields                                                               | Plugin Config                   | Component Pattern                                   |
| ------------- | -------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------- |
| **Text-like** | Email, Phone, Number, Link                                           | `isElement: true`               | Editable inline text with placeholder               |
| **Void**      | File upload, Signature, Rating, Date, Time, Linear scale             | `isElement: true, isVoid: true` | Custom interactive UI via `contentEditable={false}` |
| **Compound**  | Multiple choice, Checkboxes, Dropdown, Multi-select, Matrix, Ranking | `isElement: true, isVoid: true` | Options as element properties, rendered as list UI  |

See `references/` folder for per-type implementation details (differences from base pattern only).

## Prerequisite Refactoring

Before adding new field types, refactor the formLabel Enter handler in `form-blocks-kit.tsx` to use `FORM_FIELD_TYPES` instead of hardcoded type checks:

```tsx
// BEFORE (line ~252-263 in form-blocks-kit.tsx) — must update per field
if (nextNode && (nextNode.type === "formInput" || nextNode.type === "formTextarea")) {

// AFTER — auto-works for any new field type in FORM_FIELD_TYPES
if (nextNode && FORM_FIELD_TYPES.has(nextNode.type) && nextNode.type !== "formLabel" && nextNode.type !== "formButton" && nextNode.type !== "pageBreak") {
```

Also update `block-menu.tsx` `getFieldType()` to recognize new types (see Step 6).

## File Locations (10 Touch Points)

| #   | Purpose                      | File Path                                                        |
| --- | ---------------------------- | ---------------------------------------------------------------- |
| 1   | Editor UI Component          | `src/components/ui/form-{type}-node.tsx`                         |
| 2   | FORM_FIELD_TYPES set         | `src/components/editor/plugins/form-blocks-kit.tsx` (line 11-17) |
| 3   | Plate Plugin + FormBlocksKit | `src/components/editor/plugins/form-blocks-kit.tsx`              |
| 4   | Slash Command Menu           | `src/components/ui/slash-node.tsx`                               |
| 5   | Insert Transforms            | `src/components/editor/transforms.ts`                            |
| 6   | Block Menu Options           | `src/components/ui/block-menu.tsx`                               |
| 7   | Transformation               | `src/lib/transform-plate-to-form.ts`                             |
| 8   | Preview Element Router       | `src/components/form-components/form-preview-from-plate.tsx`     |
| 9   | Preview Renderer             | `src/components/form-components/render-preview-input.tsx`        |
| 10  | Zod Schema                   | `src/lib/generate-zod-schema.ts`                                 |

## Step 1: Create Editor Node Component

Create `src/components/ui/form-{type}-node.tsx`.

### Text-like fields (Email, Phone, Number, Link)

Reuse the exact formInput pattern — same styling, same focus ring, same `data-bf-input` attribute:

```tsx
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorSelector, useFocused } from "platejs/react";
import { cn } from "@/lib/utils";

export const FormEmailElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;
  const placeholder = element.placeholder as string | undefined;

  const focused = useFocused();
  const isSelected = useEditorSelector(
    (ed) => {
      if (!ed.selection) return false;
      const path = ed.api.findPath(element);
      if (!path) return false;
      const focusPath = ed.selection.focus.path;
      if (focusPath.length < path.length) return false;
      for (let i = 0; i < path.length; i++) {
        if (focusPath[i] !== path[i]) return false;
      }
      return true;
    },
    [element],
  );

  return (
    <PlateElement
      attributes={{ ...attributes, placeholder, "data-bf-input": "true" }}
      className={cn(
        "relative my-1 flex h-7 w-full max-w-[464px] items-center rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-text caret-current",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <span className="flex-1 min-w-px outline-none text-muted-foreground/50">{children}</span>
    </PlateElement>
  );
};
```

**Critical styling details:**

- `data-bf-input="true"` — Enables `--bf-input-width` CSS variable via `.bf-themed [data-bf-input]` selector in `styles.css`
- `rounded-[var(--radius-lg)]` — Uses theme-customizable radius
- `bg-card` — Maps to `--bf-card` via `.bf-themed` bridge in `styles.css`
- `shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)]` — Consistent subtle shadow
- `ring-ring/50 ring-[3px]` — Focus ring using `--bf-ring` token
- `cursor-text caret-current` — Text cursor and visible caret
- `text-muted-foreground/50` — Placeholder opacity

For textarea-like fields, change: `h-7` → `min-h-24`, `items-center` → `items-start`, add `py-2`, change `text-sm` → `text-base`.

### Void fields (File upload, Signature, Rating, Date, Time)

Void elements render custom UI. The component receives `children` but wraps its own interactive content:

```tsx
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorSelector, useFocused } from "platejs/react";
import { cn } from "@/lib/utils";

export const FormFileUploadElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, ...rest } = props;

  const focused = useFocused();
  const isSelected = useEditorSelector(/* same pattern as text-like */);

  return (
    <PlateElement
      attributes={{ ...attributes, "data-bf-input": "true" }}
      className={cn(
        "relative my-1 flex w-full max-w-[464px] items-center rounded-[var(--radius-lg)] border-0 bg-card p-4 shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-default",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      {/* Plate requires children to be rendered even for void elements */}
      <div className="hidden">{children}</div>
      {/* Your custom interactive UI here */}
      <div contentEditable={false}>
        {/* File dropzone / signature canvas / star rating / etc. */}
      </div>
    </PlateElement>
  );
};
```

**Key differences from text-like:**

- `cursor-default` instead of `cursor-text` (not editable)
- No `caret-current` (no text caret)
- `children` must be rendered but hidden (Plate requirement for void elements)
- Custom UI wrapped in `contentEditable={false}`

### Compound/Choice fields (Multiple choice, Checkboxes, Dropdown)

Options stored as element properties. Also void elements:

```tsx
// Node shape:
// { type: "formMultipleChoice", options: [{label: "Option 1", value: "opt1"}, ...], children: [{text: ""}] }

export const FormMultipleChoiceElement = ({ className, children, ...props }: PlateElementProps) => {
  const { attributes, element, editor, path, ...rest } = props;
  const options = (element.options as Array<{ label: string; value: string }>) ?? [];

  // ... same isSelected/focused pattern ...

  const updateOptions = useCallback(
    (newOptions: typeof options) => {
      editor.tf.setNodes({ options: newOptions }, { at: path });
    },
    [editor, path],
  );

  return (
    <PlateElement attributes={{ ...attributes, "data-bf-input": "true" }} /* ... */>
      <div className="hidden">{children}</div>
      <div contentEditable={false} className="flex flex-col gap-2 w-full">
        {options.map((opt, i) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input type="radio" name={element.id as string} disabled />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </PlateElement>
  );
};
```

## Step 2: Register in FORM_FIELD_TYPES Set

In `src/components/editor/plugins/form-blocks-kit.tsx`, add the new type to the set at **line 11-17**:

```tsx
const FORM_FIELD_TYPES = new Set([
  "formInput",
  "formTextarea",
  "formEmail", // ← add new type
  "formButton",
  "formLabel",
  "pageBreak",
]);
```

**This is critical** — the shared `handleFormBlockKeyDown` function checks this set. Without it, Tab/Enter/Arrow navigation won't work for your field.

## Step 3: Create Plate Plugin + Add to FormBlocksKit

In `src/components/editor/plugins/form-blocks-kit.tsx`:

### Text-like fields — reuse shared handler

```tsx
import { FormEmailElement } from "@/components/ui/form-email-node";

export const FormEmailPlugin = createPlatePlugin({
  key: "formEmail",
  node: { isElement: true, component: FormEmailElement },
  options: { gutterPosition: "center" }, // "center" for single-line, "top" for multi-line
  handlers: {
    onKeyDown: ({ editor, event }) => handleFormBlockKeyDown(editor, event),
  },
});
```

### Void fields — add isVoid and optional custom keyboard handling

```tsx
export const FormFileUploadPlugin = createPlatePlugin({
  key: "formFileUpload",
  node: {
    isElement: true,
    isVoid: true,
    component: FormFileUploadElement,
  },
  options: { gutterPosition: "center" },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      // Custom handling first (e.g., Space to open file picker)
      if (event.key === " ") {
        event.preventDefault();
        // trigger file picker...
        return;
      }
      // Fall through to shared handler for Tab/Enter/Arrow
      handleFormBlockKeyDown(editor, event);
    },
  },
});
```

### Add to FormBlocksKit export (line ~1149):

```tsx
export const FormBlocksKit = [
  GlobalKeyboardNavigationPlugin,
  FormLabelPlugin,
  FormInputPlugin,
  FormButtonPlugin,
  FormTextareaPlugin,
  FormEmailPlugin, // ← add here
  PageBreakPlugin,
];
```

## Step 4: Add to Slash Command Menu

In `src/components/ui/slash-node.tsx`, add to the `"Form blocks"` group:

```tsx
{
  group: "Form blocks",
  items: [
    // ... existing items
    {
      icon: <AtSignIcon />,     // import from lucide-react
      keywords: ["form", "email", "address", "mail"],
      label: "Email",
      value: "formEmail",
    },
  ].map((item) => ({ ... })),
},
```

## Step 5: Add Insert Transform Handler

In `src/components/editor/transforms.ts`, add to `insertBlockMap`:

```tsx
const insertBlockMap: Record<string, (editor: PlateEditor, type: string) => void> = {
  // ... existing handlers
  formEmail: (editor) => {
    const block = editor.api.block();
    if (!block) return;

    const [, path] = block;
    const labelPath = PathApi.next(path);

    editor.tf.insertNodes(
      [
        {
          type: "formLabel",
          required: false,
          placeholder: "Type a question",
          children: [{ text: "" }],
        },
        {
          type: "formEmail",
          placeholder: "email@example.com",
          children: [{ text: "" }],
        },
      ] as any,
      { at: labelPath },
    );

    editor.tf.select({ path: [...labelPath, 0], offset: 0 });
  },
};
```

**Pattern:** Always insert a `formLabel` + field pair. Focus the label so user types the question first.

For **compound fields**, include default options:

```tsx
formMultipleChoice: (editor) => {
  // ... same label insertion pattern, then:
  {
    type: "formMultipleChoice",
    options: [
      { label: "Option 1", value: "opt1" },
      { label: "Option 2", value: "opt2" },
      { label: "Option 3", value: "opt3" },
    ],
    children: [{ text: "" }],
  },
},
```

## Step 6: Update Block Menu

In `src/components/ui/block-menu.tsx`:

```tsx
// Update getFieldType() to recognize the new type
function getFieldType(nodeType: string | undefined): BlockFieldType {
  if (!nodeType) return "unknown";
  if (["formLabel", "formInput", "formTextarea", "formEmail"].includes(nodeType))
    return "formInput";
  // ...
}
```

**Also update these functions** to handle the new type:

- `labelNode` useMemo — check for new type as previous/next sibling
- `inputNode` useMemo — check for new type as next sibling
- `getInputPath` — handle new type
- `handleToggleRequired` — handle new type
- `handleUpdateFieldName` — handle new type

## Step 7: Update Transformation Logic

In `src/lib/transform-plate-to-form.ts`:

1. Add to `PlateFormField` union type:

```tsx
| {
    id: string;
    name: string;
    fieldType: "Email";
    label?: string;
    placeholder?: string;
    required?: boolean;
  }
```

2. Update the `formLabel` case to recognize new type:

```tsx
if (
  nextNode &&
  FORM_FIELD_TYPES.has(nextNode.type) &&
  nextNode.type !== "formLabel" &&
  nextNode.type !== "formButton" &&
  nextNode.type !== "pageBreak"
) {
  const typeMap: Record<string, string> = {
    formInput: "Input",
    formTextarea: "Textarea",
    formEmail: "Email",
  };
  fieldType = typeMap[nextNode.type] ?? "Input";
}
```

3. Add skip case for standalone field node:

```tsx
case "formInput":
case "formTextarea":
case "formEmail":    // ← add
  break;
```

## Step 8: Update Preview Element Router

In `src/components/form-components/form-preview-from-plate.tsx`:

```tsx
if (
  element.fieldType === "Input" ||
  element.fieldType === "Textarea" ||
  element.fieldType === "Email" || // ← add
  element.fieldType === "Button"
) {
  return <RenderPreviewInput field={element as PlateFormField} form={form} />;
}
```

**CRITICAL**: Without this, the field returns `null` and won't render in preview/demo mode.

## Step 9: Update Preview Renderer

In `src/components/form-components/render-preview-input.tsx`:

```tsx
if (field.fieldType === "Email") {
  return (
    <form.AppField name={field.name}>
      {(f) => (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            type="email"
            placeholder={field.placeholder}
            value={(f.state.value as string) ?? ""}
            onChange={(e) => f.handleChange(e.target.value)}
          />
        </div>
      )}
    </form.AppField>
  );
}
```

## Step 10: Add Zod Schema Generator

In `src/lib/generate-zod-schema.ts`:

```tsx
const FIELD_SCHEMA_MAP = new Map([
  // ... existing entries
  [
    "Email",
    () =>
      z
        .string({ error: "This field is required" })
        .nonempty("This field is required")
        .email("Please enter a valid email address"),
  ],
]);
```

## Keyboard Navigation Reference

All fields added to `FORM_FIELD_TYPES` and using `handleFormBlockKeyDown` inherit this behavior:

| Key                            | Behavior                                                  |
| ------------------------------ | --------------------------------------------------------- |
| Tab                            | Move to next block (skip formButtons and pageBreaks)      |
| Shift+Tab                      | Move to previous block (skip formButtons and pageBreaks)  |
| ArrowDown                      | Move to next block (skip formButtons and pageBreaks)      |
| ArrowUp                        | Move to previous block (skip formButtons and pageBreaks)  |
| ArrowLeft (at start)           | Blocked if previous is formButton/pageBreak               |
| Enter (in formLabel)           | Move focus to adjacent input field below                  |
| Enter (at start, with content) | Insert paragraph ABOVE, push field down                   |
| Enter (empty or middle/end)    | Insert paragraph BELOW (before buttons/pageBreaks)        |
| Shift+Enter                    | Insert newline within current block                       |
| Backspace (empty)              | Delete the block (protected: formButton can't be deleted) |

**Fields needing custom keyboard handling** (add BEFORE the `handleFormBlockKeyDown` fallthrough):

- Date picker: Escape to close calendar, Arrow keys within calendar
- Phone with country selector: Arrow keys within dropdown
- File upload: Space/Enter to open file picker
- Rating: Arrow left/right to change star count
- Matrix: Arrow keys navigate cells, Tab moves between cells
- Ranking: Arrow + Shift to reorder items

## Styling System

### CSS Variable Cascade

```
User customizes → --bf-* variables (via customize-sidebar.tsx)
                → .bf-themed bridge (styles.css lines 563-750)
                → Standard shadcn tokens (--card, --ring, --radius, etc.)
                → Tailwind classes (bg-card, ring-ring, rounded-[var(--radius-lg)])
```

### The `data-bf-input` Attribute

Applied via `attributes` prop. Enables this CSS rule in `styles.css`:

```css
.bf-themed [data-bf-input] {
  max-width: var(--bf-input-width);
}
```

This allows users to customize field width. **All form field elements must include this attribute.**

### `gutterPosition` Option

Controls drag handle alignment on the block:

- `"center"` — single-line fields (formInput, formEmail, formLabel)
- `"top"` — multi-line fields (formTextarea, formMultipleChoice, formMatrix)

## Document Structure

All fields follow the **label + input sibling** pattern (no wrapper element):

```
// Editor document tree (flat siblings):
[
  { type: "formLabel", required: true, placeholder: "Type a question", children: [{text: "Your email"}] },
  { type: "formEmail", placeholder: "email@example.com", children: [{text: ""}] },
  { type: "formLabel", required: false, placeholder: "Type a question", children: [{text: "Upload file"}] },
  { type: "formFileUpload", children: [{text: ""}] },
  { type: "formButton", buttonType: "submit", children: [{text: ""}] },
]
```

## Node Properties

| Property       | Location                              | Purpose                                     |
| -------------- | ------------------------------------- | ------------------------------------------- |
| `type`         | Node type key                         | Plate node identifier (e.g., `"formEmail"`) |
| `placeholder`  | `element.placeholder`                 | Shown when field is empty                   |
| `required`     | `element.required` on **label** node  | Validation flag (asterisk badge)            |
| `minLength`    | `element.minLength` on input node     | Min character validation                    |
| `maxLength`    | `element.maxLength` on input node     | Max character validation                    |
| `defaultValue` | `element.defaultValue` on input node  | Pre-filled value                            |
| `options`      | `element.options` on **choice** nodes | Array of `{label, value}` for choice fields |

## Testing Checklist

1. Insert via slash command — field + label appear correctly
2. Tab/Shift+Tab navigates through all form fields
3. Enter in label moves to input field below
4. Enter in input creates new paragraph below
5. Backspace on empty field deletes it
6. ArrowDown/Up skip formButtons and pageBreaks
7. Right-click block menu shows correct field options
8. Switch to demo mode (`?demo=true`) — field renders and validates
9. Form submission includes the field value
10. `--bf-input-width` CSS var controls field width

## Common Mistakes

| Mistake                                   | Fix                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Field not in slash menu                   | Add entry to `groups` array in `slash-node.tsx`                       |
| Slash command doesn't insert              | Add handler to `insertBlockMap` in `transforms.ts`                    |
| Plugin not rendering                      | Add component to `FormBlocksKit` array                                |
| **Keyboard nav broken**                   | **Add type to `FORM_FIELD_TYPES` set (line 11-17)**                   |
| Tab/Enter skips wrong block               | Add `event.stopPropagation()` after `event.preventDefault()`          |
| Enter at start doesn't create block above | Check cursor position with `editor.api.edges(path)`                   |
| Block menu doesn't show options           | Update `getFieldType()` AND node lookup functions in `block-menu.tsx` |
| Field missing in preview                  | Add fieldType to condition in `form-preview-from-plate.tsx`           |
| **Field width not customizable**          | **Add `"data-bf-input": "true"` to element attributes**               |
| No validation                             | Add generator to `FIELD_SCHEMA_MAP` in `generate-zod-schema.ts`       |
| Void element crashes                      | Render `children` in a hidden div — Plate requires it                 |
| Double keyboard handling                  | Use `__formBlockHandled` flag (already in shared handler)             |
