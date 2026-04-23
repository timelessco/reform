# Date Field

## Node Properties

- **type:** `"formDate"`
- **placeholder:** `"Select a date"`
- **Additional:** `minDate` (string), `maxDate` (string), `format` (string)

## Editor Component

Void element — renders a date picker UI. Uses the card styling pattern but with `isVoid: true`.

Shows a calendar icon and placeholder text. The actual calendar popup appears in preview mode.

## Plugin Config

```tsx
{
  key: "formDate",
  node: { isElement: true, isVoid: true, component: FormDateElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

**Custom handling needed:**

- If calendar popup is open: Arrow keys navigate calendar, Escape closes popup, Enter selects date
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `CalendarIcon` (lucide-react)
- **Keywords:** `["form", "date", "calendar", "day", "month", "year"]`
- **Label:** `"Date"`

## Validation (Zod)

```tsx
z.string().nonempty("Please select a date").date("Please enter a valid date");
```

## Preview Component

Use a date picker component (e.g., from shadcn/ui) with calendar popup.
