# Dropdown Field

## Node Properties

- **type:** `"formDropdown"`
- **placeholder:** `"Select an option"`
- **options:** `Array<{label: string; value: string}>` — stored as element property

## Editor Component

Void element — renders a select/dropdown preview.

## Plugin Config

```tsx
{
  key: "formDropdown",
  node: { isElement: true, isVoid: true, component: FormDropdownElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

**Custom handling needed:**

- Space/Enter: open dropdown
- If dropdown open: Arrow keys navigate, Escape closes
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `ChevronDownIcon` (lucide-react)
- **Keywords:** `["form", "dropdown", "select", "combobox", "pick"]`
- **Label:** `"Dropdown"`

## Validation (Zod)

```tsx
z.string().nonempty("Please select an option");
```

## Preview Component

Use shadcn `<Select>` component.
