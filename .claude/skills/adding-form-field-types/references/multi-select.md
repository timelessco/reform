# Multi-select Field

## Node Properties

- **type:** `"formMultiSelect"`
- **placeholder:** `"Select options"`
- **options:** `Array<{label: string; value: string}>` — stored as element property

## Editor Component

Void element — renders a multi-select with tags/chips for selected items.

## Plugin Config

```tsx
{
  key: "formMultiSelect",
  node: { isElement: true, isVoid: true, component: FormMultiSelectElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

Same as Dropdown — Arrow keys in open state, Escape to close.

## Slash Menu

- **Icon:** `CheckCheckIcon` (lucide-react)
- **Keywords:** `["form", "multi", "select", "tags", "multiple"]`
- **Label:** `"Multi-select"`

## Validation (Zod)

```tsx
z.array(z.string()).min(1, "Please select at least one option");
```

## Preview Component

Multi-select component with chip/tag display for selected values.
