# Link Field

## Node Properties

- **type:** `"formLink"`
- **placeholder:** `"https://example.com"`
- **HTML input type:** `url`

## Editor Component

Identical to `form-input-node.tsx`. Single-line text-like field.

## Plugin Config

```tsx
{ key: "formLink", node: { isElement: true }, options: { gutterPosition: "center" } }
```

## Keyboard

Inherits shared handler. No custom keys needed.

## Slash Menu

- **Icon:** `LinkIcon` (lucide-react)
- **Keywords:** `["form", "link", "url", "website", "href"]`
- **Label:** `"Link"`

## Validation (Zod)

```tsx
z.string().nonempty("This field is required").url("Please enter a valid URL");
```

## Preview Component

```tsx
<Input type="url" placeholder={field.placeholder} />
```
