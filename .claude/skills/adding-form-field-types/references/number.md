# Number Field

## Node Properties

- **type:** `"formNumber"`
- **placeholder:** `"0"`
- **HTML input type:** `number`
- **Additional:** `min` (number), `max` (number), `step` (number)

## Editor Component

Identical to `form-input-node.tsx`. Single-line text-like field.

## Plugin Config

```tsx
{ key: "formNumber", node: { isElement: true }, options: { gutterPosition: "center" } }
```

## Keyboard

Inherits shared handler. No custom keys needed.

## Slash Menu

- **Icon:** `HashIcon` (lucide-react)
- **Keywords:** `["form", "number", "numeric", "integer", "amount", "quantity"]`
- **Label:** `"Number"`

## Validation (Zod)

```tsx
z.coerce.number({ error: "Please enter a valid number" }).min(min).max(max);
```

## Preview Component

```tsx
<Input
  type="number"
  placeholder={field.placeholder}
  min={field.min}
  max={field.max}
  step={field.step}
/>
```
