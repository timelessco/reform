# Linear Scale Field

## Node Properties

- **type:** `"formLinearScale"`
- **Additional:** `min` (number, default `1`), `max` (number, default `5`), `minLabel` (string), `maxLabel` (string)

## Editor Component

Void element — renders numbered scale with labels at endpoints.

## Plugin Config

```tsx
{
  key: "formLinearScale",
  node: { isElement: true, isVoid: true, component: FormLinearScaleElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

**Custom handling needed:**

- ArrowLeft/ArrowRight: move selection along scale
- Number keys: jump to specific value
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `EllipsisIcon` (lucide-react)
- **Keywords:** `["form", "linear", "scale", "range", "slider", "1-5", "1-10"]`
- **Label:** `"Linear scale"`

## Validation (Zod)

```tsx
z.number().min(min).max(max);
```

## Preview Component

Row of numbered buttons/circles, with min/max labels underneath.
