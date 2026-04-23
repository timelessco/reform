# Ranking Field

## Node Properties

- **type:** `"formRanking"`
- **options:** `Array<{label: string; value: string}>` — stored as element property

## Editor Component

Void element — renders a drag-to-reorder list with grip handles.

## Plugin Config

```tsx
{
  key: "formRanking",
  node: { isElement: true, isVoid: true, component: FormRankingElement },
  options: { gutterPosition: "top" },
}
```

## Keyboard

**Custom handling needed:**

- ArrowUp/Down + modifier (Shift or Alt): reorder items
- ArrowUp/Down without modifier: move focus between items
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `ListOrderedIcon` (lucide-react)
- **Keywords:** `["form", "ranking", "rank", "order", "sort", "drag"]`
- **Label:** `"Ranking"`

## Validation (Zod)

```tsx
z.array(z.string()).length(options.length, "Please rank all items");
```

## Preview Component

Sortable list with drag handles (consider `@dnd-kit/sortable`).
