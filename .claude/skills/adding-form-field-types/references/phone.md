# Phone Number Field

## Node Properties

- **type:** `"formPhone"`
- **placeholder:** `"+1 (555) 000-0000"`
- **HTML input type:** `tel`
- **Additional:** `countryCode` (string, default `"US"`)

## Editor Component

Based on `form-input-node.tsx` but with a country code prefix area.

Consider adding a non-editable country flag/code button on the left side of the input, inside `contentEditable={false}`.

## Plugin Config

```tsx
{ key: "formPhone", node: { isElement: true }, options: { gutterPosition: "center" } }
```

## Keyboard

**Custom handling needed:**

- If country selector dropdown is open: Arrow keys navigate dropdown, Escape closes it
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `PhoneIcon` (lucide-react)
- **Keywords:** `["form", "phone", "telephone", "number", "call", "mobile"]`
- **Label:** `"Phone number"`

## Validation (Zod)

```tsx
z.string()
  .nonempty("This field is required")
  .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number");
```

## Preview Component

```tsx
<Input type="tel" placeholder={field.placeholder} />
```

Consider using a phone input library with country selector for preview mode.
