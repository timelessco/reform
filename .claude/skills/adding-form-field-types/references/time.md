# Time Field

## Node Properties

- **type:** `"formTime"`
- **placeholder:** `"Select a time"`
- **Additional:** `format` (`"12h"` | `"24h"`)

## Editor Component

Void element — renders time picker UI.

## Plugin Config

```tsx
{
  key: "formTime",
  node: { isElement: true, isVoid: true, component: FormTimeElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

**Custom handling needed:**

- If time dropdown is open: Arrow keys navigate options, Escape closes
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `ClockIcon` (lucide-react)
- **Keywords:** `["form", "time", "clock", "hour", "minute"]`
- **Label:** `"Time"`

## Validation (Zod)

```tsx
z.string().nonempty("Please select a time");
```

## Preview Component

Use a time picker or `<Input type="time" />`.
