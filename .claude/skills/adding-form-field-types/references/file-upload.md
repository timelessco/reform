# File Upload Field

## Node Properties

- **type:** `"formFileUpload"`
- **Additional:** `accept` (string, e.g. `".pdf,.doc"`), `maxSize` (number, bytes), `multiple` (boolean)

## Editor Component

Void element — renders a dropzone/upload area with dashed border.

## Plugin Config

```tsx
{
  key: "formFileUpload",
  node: { isElement: true, isVoid: true, component: FormFileUploadElement },
  options: { gutterPosition: "center" },
}
```

## Keyboard

**Custom handling needed:**

- Space/Enter: open file picker dialog
- Otherwise: falls through to shared handler

## Slash Menu

- **Icon:** `UploadIcon` (lucide-react)
- **Keywords:** `["form", "file", "upload", "attachment", "document"]`
- **Label:** `"File upload"`

## Validation (Zod)

```tsx
z.instanceof(File).refine((f) => f.size <= maxSize, "File too large");
// or for required:
z.instanceof(File, { message: "Please upload a file" });
```

## Preview Component

Render a file dropzone with drag-and-drop support and a browse button.
