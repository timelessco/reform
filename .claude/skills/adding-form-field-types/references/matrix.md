# Matrix Field

## Node Properties

- **type:** `"formMatrix"`
- **rows:** `Array<{label: string; value: string}>`
- **columns:** `Array<{label: string; value: string}>`
- **Additional:** `inputType` (`"radio"` | `"checkbox"`)

## Editor Component

Void element — renders a table grid with row labels and column headers.

Most complex compound field. In editor mode, shows a simplified table preview.

## Plugin Config

```tsx
{
  key: "formMatrix",
  node: { isElement: true, isVoid: true, component: FormMatrixElement },
  options: { gutterPosition: "top" },
}
```

## Keyboard

**Custom handling needed:**

- Arrow keys: navigate cells within the matrix grid
- Space/Enter: toggle selection in current cell
- Tab: move to next cell, then next row
- Escape: exit matrix and return to normal navigation
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `GridIcon` (lucide-react)
- **Keywords:** `["form", "matrix", "grid", "table", "likert"]`
- **Label:** `"Matrix"`

## Insert Transform

Default structure:

```tsx
{
  type: "formMatrix",
  rows: [
    { label: "Row 1", value: "row1" },
    { label: "Row 2", value: "row2" },
  ],
  columns: [
    { label: "Column 1", value: "col1" },
    { label: "Column 2", value: "col2" },
    { label: "Column 3", value: "col3" },
  ],
  inputType: "radio",
  children: [{ text: "" }],
}
```

## Validation (Zod)

```tsx
// Each row must have a selection
z.record(z.string(), z.string().nonempty()).refine(
  (val) => rows.every((r) => val[r.value]),
  "Please answer all rows",
);
```

## Preview Component

HTML table with radio/checkbox inputs at each intersection.
