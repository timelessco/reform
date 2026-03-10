---
name: adding-form-field-types
description: Use when adding new form field types to the Plate.js editor, such as email, phone, date picker, or custom inputs
---

# Adding Form Field Types

## Overview

Adding a new field type to the form builder requires changes across 9 files. The field must work in both editor mode (editable placeholder) and preview/demo mode (functional form input with validation).

## File Locations

| Purpose                | File Path                                                    |
| ---------------------- | ------------------------------------------------------------ |
| Editor UI Component    | `src/components/ui/form-{type}-node.tsx`                     |
| Plate Plugin           | `src/components/editor/plugins/form-blocks-kit.tsx`          |
| Slash Command Menu     | `src/components/ui/slash-node.tsx`                           |
| Insert Transforms      | `src/components/editor/transforms.ts`                        |
| Block Menu Options     | `src/components/ui/block-menu.tsx`                           |
| Transformation         | `src/lib/transform-plate-to-form.ts`                         |
| Preview Element Router | `src/components/form-components/form-preview-from-plate.tsx` |
| Preview Renderer       | `src/components/form-components/render-preview-input.tsx`    |
| Zod Schema             | `src/lib/generate-zod-schema.ts`                             |

## Implementation Checklist

### 1. Create Editor Node Component

Create `src/components/ui/form-{type}-node.tsx`:

```tsx
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

export function FormEmailElement({ className, children, ...props }: PlateElementProps) {
  const placeholder = props.element.placeholder as string | undefined;
  const isEmpty = props.editor.api.isEmpty(props.element);

  return (
    <PlateElement className={cn("m-0 px-0 py-1", className)} {...props}>
      <div
        className={cn(
          "relative flex h-9 w-full max-w-md items-center rounded-md border border-input bg-transparent px-3 py-1",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        )}
      >
        {isEmpty && placeholder && (
          <span className="absolute text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <span className={cn(isEmpty ? "text-transparent" : "")}>{children}</span>
      </div>
    </PlateElement>
  );
}
```

### 2. Register Plate Plugin

In `src/components/editor/plugins/form-blocks-kit.tsx`:

```tsx
import { FormTextareaElement } from "@/components/ui/form-textarea-node";

export const FormTextareaPlugin = createPlatePlugin({
  key: "formTextarea",
  node: {
    isElement: true,
    component: FormTextareaElement,
  },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      const block = editor.api.block();
      if (!block || block[0].type !== "formTextarea") return;

      const [node, path] = block;

      // Tab: Move to next block
      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation(); // CRITICAL: Prevents double-move when navigating to another form block
        const nextPath = PathApi.next(path);
        const nextNode = editor.api.node(nextPath);
        if (nextNode) {
          editor.tf.select({ path: [...nextPath, 0], offset: 0 });
        }
        return;
      }

      // Shift+Tab: Move to previous block
      if (event.key === "Tab" && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        const prevPath = PathApi.previous(path);
        if (prevPath) {
          const prevNode = editor.api.node(prevPath);
          if (prevNode) {
            editor.tf.select({ path: [...prevPath, 0], offset: 0 });
          }
        }
        return;
      }

      // Enter: Move to next block (not create new line)
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        const nextPath = PathApi.next(path);
        const nextNode = editor.api.node(nextPath);
        if (nextNode) {
          editor.tf.select({ path: [...nextPath, 0], offset: 0 });
        }
        return;
      }

      // Backspace on empty: Delete the block
      if (event.key === "Backspace" && editor.api.isEmpty(node)) {
        event.preventDefault();
        event.stopPropagation();
        editor.tf.removeNodes({ at: path });
        return;
      }
    },
  },
});

// Add to exports
export const FormBlocksKit = [FormLabelPlugin, FormInputPlugin, FormTextareaPlugin];
```

**Keyboard Navigation:**
| Key | Behavior |
|-----|----------|
| Tab | Move to next block |
| Shift+Tab | Move to previous block |
| Enter (empty or middle/end) | Insert new paragraph below |
| Enter (at start with content) | Insert new paragraph above, push content down |
| Backspace (empty) | Delete the block |

### 3. Add to Slash Command Menu

In `src/components/ui/slash-node.tsx`:

```tsx
// Import icon for your field type
import { AlignLeftIcon } from "lucide-react";

// Add to the "Form blocks" group in the groups array
{
  group: "Form blocks",
  items: [
    // ... existing items
    {
      icon: <AlignLeftIcon />,
      keywords: ["form", "textarea", "multiline", "long", "paragraph"],
      label: "Text Area",
      value: "formTextarea",
    },
  ].map((item) => ({ ... })),
},
```

### 4. Add Insert Transform Handler

In `src/components/editor/transforms.ts`:

```tsx
// Add to insertBlockMap object
const insertBlockMap: Record<string, (editor: PlateEditor, type: string) => void> = {
  // ... existing handlers
  formTextarea: (editor) => {
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
          type: "formTextarea",
          placeholder: "Enter your detailed answer",
          children: [{ text: "" }],
        },
      ] as any,
      { at: labelPath },
    );

    // Focus cursor at start of label block
    editor.tf.select({ path: [...labelPath, 0], offset: 0 });
  },
};
```

### 5. Add Block Menu Options

In `src/components/ui/block-menu.tsx`:

```tsx
// Update getFieldType() to recognize the new type
function getFieldType(nodeType: string | undefined): BlockFieldType {
  if (!nodeType) return "unknown";
  if (["formLabel", "formInput", "formTextarea"].includes(nodeType)) return "formInput";
  // ...
}

// IMPORTANT: Also update these functions to handle the new type:
// - labelNode useMemo (check for formTextarea as previous sibling)
// - inputNode useMemo (check for formTextarea as next sibling)
// - getInputPath (handle formTextarea)
// - handleToggleRequired (handle formTextarea)
// - handleUpdateFieldName (handle formTextarea)
```

### 6. Update Transformation Logic

In `src/lib/transform-plate-to-form.ts`:

```tsx
// Add to PlateFormField union type
export type PlateFormField = {
  // ... existing Input type
} | {
  id: string;
  name: string;
  fieldType: "Textarea";
  label?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
};

// Update the formLabel case to handle formTextarea
if (nextNode && (nextNode.type === "formInput" || nextNode.type === "formTextarea")) {
  fieldType = nextNode.type === "formTextarea" ? "Textarea" : "Input";
  // ... rest of logic
}

// Add skip case for standalone formTextarea
case "formInput":
case "formTextarea":
  break;
```

### 7. Update Preview Renderer

In `src/components/form-components/render-preview-input.tsx`:

```tsx
import { Textarea } from "@/components/ui/textarea";

// Handle Textarea field type
if (field.fieldType === "Textarea") {
  return (
    <form.AppField name={field.name}>
      {(f) => (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Textarea
            placeholder={field.placeholder}
            value={(f.state.value as string) ?? ""}
            onChange={(e) => f.handleChange(e.target.value)}
            className="min-h-24"
          />
        </div>
      )}
    </form.AppField>
  );
}
```

### 8. Update Preview Element Router

In `src/components/form-components/form-preview-from-plate.tsx`:

```tsx
// In RenderPreviewElement function, update the condition to include new field type
// Form fields (Input, Textarea, Button)
if (
  element.fieldType === "Input" ||
  element.fieldType === "Textarea" ||
  element.fieldType === "Button"
) {
  return <RenderPreviewInput field={element as PlateFormField} form={form} />;
}
```

**CRITICAL**: This file decides WHICH elements get passed to `RenderPreviewInput`. If you don't add your field type here, it will return `null` and not render in preview mode!

### 9. Add Zod Schema Generator (if needed)

In `src/lib/generate-zod-schema.ts`:

```tsx
// Add to FIELD_SCHEMA_MAP if you need custom validation
const FIELD_SCHEMA_MAP = new Map([
  // ... existing entries
  [
    "Textarea",
    () =>
      z
        .string({ error: "This field is required" })
        .nonempty("This field is required")
        .min(10, "Minimum 10 characters required"),
  ],
]);
```

Note: If "Textarea" already exists in the map (check first!), you may not need changes here.

## Quick Reference: Node Properties

| Property       | Location                             | Purpose                                   |
| -------------- | ------------------------------------ | ----------------------------------------- |
| `type`         | Node type key                        | Plate node identifier (e.g., "formEmail") |
| `placeholder`  | `element.placeholder`                | Shown when field is empty                 |
| `required`     | `element.required` on label node     | Validation flag                           |
| `minLength`    | `element.minLength` on input node    | Min character validation                  |
| `maxLength`    | `element.maxLength` on input node    | Max character validation                  |
| `defaultValue` | `element.defaultValue` on input node | Pre-filled value                          |

## Testing the Field Type

1. Add the field to the editor toolbar/slash command
2. Insert the field and verify Tab/Shift+Tab navigation works
3. Right-click to verify block menu shows correct options
4. Switch to demo mode (`?demo=true`) and verify:
   - Field renders correctly
   - Validation works (try invalid email format)
   - Form submission includes the field value

## Common Mistakes

| Mistake                                       | Fix                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Field not in slash menu                       | Add entry to `groups` array in `slash-node.tsx`                                                        |
| Slash command doesn't insert                  | Add handler to `insertBlockMap` in `transforms.ts`                                                     |
| Plugin not rendering                          | Add component to `FormBlocksKit` array                                                                 |
| Tab navigation broken                         | Check `onKeyDown` handler and node type check                                                          |
| **Tab/Enter skips to wrong block**            | **Add `event.stopPropagation()` after `event.preventDefault()` - prevents other handlers from firing** |
| **Enter at start doesn't create block above** | **Check cursor position with `editor.api.edges(path)` and compare with `selection.anchor.offset`**     |
| Block menu doesn't show options               | Update `getFieldType()` AND node lookup functions in `block-menu.tsx`                                  |
| Field missing in preview                      | Add case to `transformPlateStateToFormElements()`                                                      |
| **Field not rendering in preview**            | **Add fieldType to condition in `RenderPreviewElement` in `form-preview-from-plate.tsx`**              |
| No validation                                 | Add generator to `FIELD_SCHEMA_MAP` in `generate-zod-schema.ts`                                        |
