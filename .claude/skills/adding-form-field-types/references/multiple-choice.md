# Multiple Choice Field

## Node Properties

- **type:** `"formMultipleChoice"`
- **options:** `Array<{label: string; value: string}>` — stored as element property
- **Additional:** `allowOther` (boolean)

## Editor Component

Void element — renders radio button list. Options edited via the block menu or inline UI.

## Plugin Config

```tsx
{
  key: "formMultipleChoice",
  node: { isElement: true, isVoid: true, component: FormMultipleChoiceElement },
  options: { gutterPosition: "top" },
}
```

## Keyboard

**Custom handling needed:**

- Arrow Up/Down within options list to navigate between choices
- Enter to add a new option
- Backspace on empty option to delete it
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `CircleCheckIcon` (lucide-react)
- **Keywords:** `["form", "multiple", "choice", "radio", "select", "option"]`
- **Label:** `"Multiple choice"`

## Insert Transform

Default options:

```tsx
{
  type: "formMultipleChoice",
  options: [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" },
    { label: "Option 3", value: "opt3" },
  ],
  children: [{ text: "" }],
}
```

## Validation (Zod)

```tsx
z.string().nonempty("Please select an option");
```

## Preview Component

Render as radio button group with labels.
