# Signature Field

## Node Properties

- **type:** `"formSignature"`
- **Additional:** `penColor` (string), `backgroundColor` (string)

## Editor Component

Void element — renders a signature pad canvas area with a clear button.

## Plugin Config

```tsx
{
  key: "formSignature",
  node: { isElement: true, isVoid: true, component: FormSignatureElement },
  options: { gutterPosition: "top" },
}
```

## Keyboard

Inherits shared handler. Drawing is mouse/touch only.

## Slash Menu

- **Icon:** `PenToolIcon` (lucide-react)
- **Keywords:** `["form", "signature", "sign", "autograph", "draw"]`
- **Label:** `"Signature"`

## Validation (Zod)

```tsx
z.string().nonempty("Please provide a signature");
// Signature stored as data URL or SVG path string
```

## Preview Component

Canvas-based signature pad (consider a library like `react-signature-canvas`).
