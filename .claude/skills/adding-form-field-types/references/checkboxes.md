# Checkboxes Field

## Node Properties

- **type:** `"formCheckboxes"`
- **options:** `Array<{label: string; value: string}>` — stored as element property
- **Additional:** `minSelect` (number), `maxSelect` (number)

## Editor Component

Void element — renders checkbox list. Nearly identical to multiple choice but with checkboxes.

## Plugin Config

```tsx
{
  key: "formCheckboxes",
  node: { isElement: true, isVoid: true, component: FormCheckboxesElement },
  options: { gutterPosition: "top" },
}
```

## Keyboard

Same custom handling as Multiple Choice (arrow nav, enter to add, backspace to delete option).

## Slash Menu

- **Icon:** `CheckSquareIcon` (lucide-react)
- **Keywords:** `["form", "checkbox", "check", "multi", "tick"]`
- **Label:** `"Checkboxes"`

## Validation (Zod)

```tsx
z.array(z.string()).min(minSelect ?? 1, "Please select at least one option");
```

## Preview Component

Render as checkbox group with labels.
