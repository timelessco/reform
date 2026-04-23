# Email Field

## Node Properties

- **type:** `"formEmail"`
- **placeholder:** `"email@example.com"`
- **HTML input type:** `email`

## Editor Component

Identical to `form-input-node.tsx`. Single-line, `h-7`, same shadow/ring styling.

No custom behavior — inherits base text-input pattern entirely.

## Plugin Config

```tsx
{ key: "formEmail", node: { isElement: true }, options: { gutterPosition: "center" } }
```

## Keyboard

Inherits shared handler. No custom keys needed.

## Slash Menu

- **Icon:** `AtSignIcon` (lucide-react)
- **Keywords:** `["form", "email", "address", "mail", "@"]`
- **Label:** `"Email"`

## Validation (Zod)

```tsx
z.string().nonempty("This field is required").email("Please enter a valid email address");
```

## Preview Component

```tsx
<Input type="email" placeholder={field.placeholder} />
```
