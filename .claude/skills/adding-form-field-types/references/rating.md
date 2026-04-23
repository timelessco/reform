# Rating Field

## Node Properties

- **type:** `"formRating"`
- **Additional:** `maxRating` (number, default `5`), `icon` (`"star"` | `"heart"` | `"emoji"`)

## Editor Component

Void element — renders a row of star/heart icons.

## Plugin Config

```tsx
{
  key: "formRating",
  node: { isElement: true, isVoid: true, component: FormRatingElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

**Custom handling needed:**

- ArrowLeft/ArrowRight: decrease/increase rating
- Number keys 1-5: set rating directly
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `StarIcon` (lucide-react)
- **Keywords:** `["form", "rating", "star", "score", "review"]`
- **Label:** `"Rating"`

## Validation (Zod)

```tsx
z.number().min(1, "Please provide a rating").max(maxRating);
```

## Preview Component

Interactive star/heart row with hover and click states.
