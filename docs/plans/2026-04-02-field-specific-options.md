# Field-Specific Block Menu Options — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the one-size-fits-all block menu options with field-type-specific settings using scrubbable number inputs.

**Architecture:** Refactor `block-menu.tsx` to detect specific field types (text-like, number, file upload, option-based variants, etc.) and render type-appropriate options. Replace toggle+input pattern for numeric values with `StyleNumberInput` scrubbers where 0 = disabled. Store new properties directly on Plate editor nodes via `editor.tf.setNodes`.

**Tech Stack:** React, Plate.js editor, StyleNumberInput scrubber, DropdownMenu (base-ui)

---

### Task 1: Extend field type detection in block-menu

**Files:**

- Modify: `src/components/ui/block-menu.tsx:36-45` (getFieldType)
- Modify: `src/components/ui/block-menu.tsx:90-101` (firstNode type)

**Step 1: Update BlockFieldType and getFieldType**

Replace the current coarse `"formInput"` bucket with granular types:

```typescript
type BlockFieldType =
  | "textLike" // formInput, formTextarea, formEmail, formPhone, formLink
  | "formNumber"
  | "formDate"
  | "formTime"
  | "formFileUpload"
  | "optionCheckbox" // formOptionItem variant="checkbox"
  | "optionMultiChoice" // formOptionItem variant="multiChoice"
  | "optionRanking" // formOptionItem variant="ranking"
  | "formMultiSelect" // formMultiSelectInput
  | "formButton"
  | "static"
  | "unknown";

const TEXT_LIKE_TYPES = new Set([
  "formInput",
  "formTextarea",
  "formEmail",
  "formPhone",
  "formLink",
]);

const getFieldType = (node: { type?: string; variant?: string } | undefined): BlockFieldType => {
  if (!node?.type) return "unknown";
  const t = node.type;
  if (t === "formLabel") return "textLike"; // resolved later from inputNode
  if (TEXT_LIKE_TYPES.has(t)) return "textLike";
  if (t === "formNumber") return "formNumber";
  if (t === "formDate") return "formDate";
  if (t === "formTime") return "formTime";
  if (t === "formFileUpload") return "formFileUpload";
  if (t === "formMultiSelectInput") return "formMultiSelect";
  if (t === "formOptionItem") {
    const v = node.variant || "checkbox";
    if (v === "multiChoice") return "optionMultiChoice";
    if (v === "ranking") return "optionRanking";
    return "optionCheckbox";
  }
  if (t === "formButton") return "formButton";
  if (["h1", "h2", "h3", "p", "blockquote", "hr"].includes(t)) return "static";
  return "unknown";
};
```

**Step 2: Extend firstNode type definition**

Add new properties to the `firstNode` type at line ~90:

```typescript
const firstNode = selectedNodes[0]?.[0] as
  | {
      type?: string;
      required?: boolean;
      placeholder?: string;
      minLength?: number;
      maxLength?: number;
      defaultValue?: string;
      buttonText?: string;
      children?: Array<{ text?: string }>;
      // New properties
      variant?: string;
      minValue?: number;
      maxValue?: number;
      allowDecimals?: boolean;
      maxFileSize?: number; // in MB
      maxFiles?: number;
      allowedFileTypes?: string; // "images" | "documents" | "spreadsheets" | "all"
      minSelections?: number;
      maxSelections?: number;
      randomizeOrder?: boolean;
      allowOther?: boolean;
    }
  | undefined;
```

**Step 3: Update fieldType resolution**

Change how `fieldType` is computed — resolve from `inputNode` when available (since clicking a label should resolve to its input's type):

```typescript
const fieldType = React.useMemo(() => {
  if (inputNode) return getFieldType(inputNode as { type?: string; variant?: string });
  return getFieldType(firstNode as { type?: string; variant?: string });
}, [inputNode, firstNode]);
```

**Step 4: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "refactor: extend block-menu field type detection for type-specific options"
```

---

### Task 2: Replace numeric toggle+input with StyleNumberInput scrubbers

**Files:**

- Modify: `src/components/ui/block-menu.tsx` (replace min/max character UI)

**Step 1: Import StyleNumberInput**

Add import at top of block-menu.tsx:

```typescript
import { StyleNumberInput } from "@/components/ui/style-controls";
```

**Step 2: Replace toggle+switch handlers with direct scrubber handlers**

Remove `handleToggleMinLength`, `handleToggleMaxLength` and their associated Switch+Input UI. Replace with scrubber-based update handlers that use `editor.tf.setNodes` when value > 0 and `editor.tf.unsetNodes` when value = 0:

```typescript
const handleUpdateMinLength = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["minLength"], { at: inputPath });
    } else {
      editor.tf.setNodes({ minLength: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);

const handleUpdateMaxLength = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["maxLength"], { at: inputPath });
    } else {
      editor.tf.setNodes({ maxLength: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);
```

**Step 3: Replace the min/max character UI with StyleNumberInput**

Replace the DropdownMenuItem + Switch + conditional Input blocks with:

```tsx
<div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
  <StyleNumberInput
    label="Min characters"
    value={String(inputNode?.minLength ?? 0)}
    onChange={handleUpdateMinLength}
    min={0}
    max={1000}
    step={1}
    unit=""
    displayUnit=""
    className="!h-[30px] !text-[13px]"
  />
</div>
```

Note: `onPointerDown` stopPropagation prevents the dropdown from capturing the pointer during scrubbing.

**Step 4: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "refactor: replace toggle+input with StyleNumberInput scrubbers for min/max chars"
```

---

### Task 3: Implement text-like field options

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

Text-like fields (formInput, formTextarea, formEmail, formPhone, formLink) get:

- Required (switch) — already exists
- Default answer (switch + input) — already exists
- Min characters (scrubber, 0=off, max 1000) — from Task 2
- Max characters (scrubber, 0=off, max 1000) — from Task 2

**Step 1: Create a `TextLikeOptions` section**

Extract the existing options into a conditional block rendered when `fieldType === "textLike"`:

```tsx
{
  fieldType === "textLike" && (
    <>
      {/* Required switch — unchanged */}
      {/* Default answer toggle+input — unchanged */}
      {/* Min characters scrubber — from Task 2 */}
      {/* Max characters scrubber — from Task 2 */}
      <DropdownMenuSeparator />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "feat: text-like field options with scrubber inputs in block menu"
```

---

### Task 4: Implement number field options

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

Number field gets: Required, Default answer, Min value (scrubber), Max value (scrubber), Allow decimals (switch).

**Step 1: Add handlers for number-specific properties**

```typescript
const handleUpdateMinValue = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["minValue"], { at: inputPath });
    } else {
      editor.tf.setNodes({ minValue: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);

const handleUpdateMaxValue = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["maxValue"], { at: inputPath });
    } else {
      editor.tf.setNodes({ maxValue: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);

const handleToggleAllowDecimals = React.useCallback(() => {
  const inputPath = getInputPath();
  if (!inputPath) return;
  const current = Boolean(inputNode?.allowDecimals);
  if (current) {
    editor.tf.unsetNodes(["allowDecimals"], { at: inputPath });
  } else {
    editor.tf.setNodes({ allowDecimals: true }, { at: inputPath });
  }
}, [getInputPath, inputNode?.allowDecimals, editor.tf]);
```

**Step 2: Add the UI block**

```tsx
{
  fieldType === "formNumber" && (
    <>
      {/* Required switch */}
      {/* Default answer toggle+input */}
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Min value"
          value={String(inputNode?.minValue ?? 0)}
          onChange={handleUpdateMinValue}
          min={0}
          max={999999}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Max value"
          value={String(inputNode?.maxValue ?? 0)}
          onChange={handleUpdateMaxValue}
          min={0}
          max={999999}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <DropdownMenuItem closeOnClick={false} onClick={handleToggleAllowDecimals}>
        <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
          Allow decimals
        </span>
        <Switch
          aria-label="Allow decimals"
          size="sm"
          checked={Boolean(inputNode?.allowDecimals)}
          onCheckedChange={handleToggleAllowDecimals}
          onClick={handleStopPropagation}
        />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "feat: number field options (min/max value, allow decimals) in block menu"
```

---

### Task 5: Implement file upload field options

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

File upload gets: Required, Max file size (scrubber, 1-50MB, default 10), Max files (scrubber, 0=off, max 20), Allowed file types (dropdown).

**Step 1: Add handlers**

```typescript
const handleUpdateMaxFileSize = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 10;
    editor.tf.setNodes({ maxFileSize: num }, { at: inputPath });
  },
  [getInputPath, editor.tf],
);

const handleUpdateMaxFiles = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["maxFiles"], { at: inputPath });
    } else {
      editor.tf.setNodes({ maxFiles: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);

const handleUpdateAllowedFileTypes = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    editor.tf.setNodes({ allowedFileTypes: value }, { at: inputPath });
  },
  [getInputPath, editor.tf],
);
```

**Step 2: Add the UI block**

```tsx
{
  fieldType === "formFileUpload" && (
    <>
      {/* Required switch */}
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Max file size"
          value={`${inputNode?.maxFileSize ?? 10}MB`}
          onChange={handleUpdateMaxFileSize}
          min={1}
          max={50}
          step={1}
          unit="MB"
          displayUnit="MB"
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Max files"
          value={String(inputNode?.maxFiles ?? 0)}
          onChange={handleUpdateMaxFiles}
          min={0}
          max={20}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <DropdownMenuItem closeOnClick={false}>
        <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">File types</span>
        <Select
          value={inputNode?.allowedFileTypes ?? "all"}
          onValueChange={handleUpdateAllowedFileTypes}
        >
          <SelectTrigger className="h-6 w-[100px] text-[12px] rounded-md border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All files</SelectItem>
            <SelectItem value="images">Images</SelectItem>
            <SelectItem value="documents">Documents</SelectItem>
            <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
          </SelectContent>
        </Select>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
```

**Step 3: Import Select components** (if not already imported)

Add to imports:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

**Step 4: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "feat: file upload options (max size, max files, file types) in block menu"
```

---

### Task 6: Implement checkbox/multi-select options

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

**Checkbox** (formOptionItem variant="checkbox"): Required, Min selections, Max selections, Randomize order, "Other" option.
**Multi Select** (formMultiSelectInput): Required, Min selections, Max selections.

**Step 1: Add handlers for selection options**

```typescript
const handleUpdateMinSelections = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["minSelections"], { at: inputPath });
    } else {
      editor.tf.setNodes({ minSelections: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);

const handleUpdateMaxSelections = React.useCallback(
  (value: string) => {
    const inputPath = getInputPath();
    if (!inputPath) return;
    const num = parseInt(value, 10) || 0;
    if (num === 0) {
      editor.tf.unsetNodes(["maxSelections"], { at: inputPath });
    } else {
      editor.tf.setNodes({ maxSelections: num }, { at: inputPath });
    }
  },
  [getInputPath, editor.tf],
);

const handleToggleRandomizeOrder = React.useCallback(() => {
  const inputPath = getInputPath();
  if (!inputPath) return;
  const current = Boolean(inputNode?.randomizeOrder);
  if (current) {
    editor.tf.unsetNodes(["randomizeOrder"], { at: inputPath });
  } else {
    editor.tf.setNodes({ randomizeOrder: true }, { at: inputPath });
  }
}, [getInputPath, inputNode?.randomizeOrder, editor.tf]);

const handleToggleAllowOther = React.useCallback(() => {
  const inputPath = getInputPath();
  if (!inputPath) return;
  const current = Boolean(inputNode?.allowOther);
  if (current) {
    editor.tf.unsetNodes(["allowOther"], { at: inputPath });
  } else {
    editor.tf.setNodes({ allowOther: true }, { at: inputPath });
  }
}, [getInputPath, inputNode?.allowOther, editor.tf]);
```

**Step 2: Checkbox UI**

```tsx
{
  fieldType === "optionCheckbox" && (
    <>
      {/* Required switch */}
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Min selections"
          value={String(inputNode?.minSelections ?? 0)}
          onChange={handleUpdateMinSelections}
          min={0}
          max={50}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Max selections"
          value={String(inputNode?.maxSelections ?? 0)}
          onChange={handleUpdateMaxSelections}
          min={0}
          max={50}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <DropdownMenuItem closeOnClick={false} onClick={handleToggleRandomizeOrder}>
        <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
          Randomize order
        </span>
        <Switch
          aria-label="Randomize order"
          size="sm"
          checked={Boolean(inputNode?.randomizeOrder)}
          onCheckedChange={handleToggleRandomizeOrder}
          onClick={handleStopPropagation}
        />
      </DropdownMenuItem>
      <DropdownMenuItem closeOnClick={false} onClick={handleToggleAllowOther}>
        <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
          "Other" option
        </span>
        <Switch
          aria-label="Other option"
          size="sm"
          checked={Boolean(inputNode?.allowOther)}
          onCheckedChange={handleToggleAllowOther}
          onClick={handleStopPropagation}
        />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
```

**Step 3: Multi Select UI** (formMultiSelectInput — badge input)

```tsx
{
  fieldType === "formMultiSelect" && (
    <>
      {/* Required switch */}
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Min selections"
          value={String(inputNode?.minSelections ?? 0)}
          onChange={handleUpdateMinSelections}
          min={0}
          max={50}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <div className="px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
        <StyleNumberInput
          label="Max selections"
          value={String(inputNode?.maxSelections ?? 0)}
          onChange={handleUpdateMaxSelections}
          min={0}
          max={50}
          step={1}
          unit=""
          displayUnit=""
          className="!h-[30px] !text-[13px]"
        />
      </div>
      <DropdownMenuSeparator />
    </>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "feat: checkbox and multi-select options (selections, randomize, other) in block menu"
```

---

### Task 7: Implement multi-choice (radio) and ranking options

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

**Multi Choice** (radio): Required, Randomize order, "Other" option.
**Ranking**: Required only.

**Step 1: Multi Choice UI**

```tsx
{
  fieldType === "optionMultiChoice" && (
    <>
      {/* Required switch */}
      <DropdownMenuItem closeOnClick={false} onClick={handleToggleRandomizeOrder}>
        <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
          Randomize order
        </span>
        <Switch
          aria-label="Randomize order"
          size="sm"
          checked={Boolean(inputNode?.randomizeOrder)}
          onCheckedChange={handleToggleRandomizeOrder}
          onClick={handleStopPropagation}
        />
      </DropdownMenuItem>
      <DropdownMenuItem closeOnClick={false} onClick={handleToggleAllowOther}>
        <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">
          "Other" option
        </span>
        <Switch
          aria-label="Other option"
          size="sm"
          checked={Boolean(inputNode?.allowOther)}
          onCheckedChange={handleToggleAllowOther}
          onClick={handleStopPropagation}
        />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
```

**Step 2: Ranking and Date/Time UI**

These only get Required (universal), so no additional block needed. The Required switch is rendered for all non-static, non-button field types:

```tsx
{
  fieldType !== "static" && fieldType !== "formButton" && fieldType !== "unknown" && (
    <DropdownMenuItem closeOnClick={false} onClick={handleToggleRequired}>
      <span className="flex-1 min-w-0 text-[13px] text-foreground/80 text-left">Required</span>
      <Switch
        aria-label="Required"
        size="sm"
        checked={isRequired}
        onCheckedChange={handleToggleRequired}
        onClick={handleStopPropagation}
      />
    </DropdownMenuItem>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "feat: multi-choice and ranking options in block menu"
```

---

### Task 8: Clean up — remove old generic formInput block

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

**Step 1: Remove the old `{fieldType === "formInput" && (...)}` block**

The old block (lines 484-579) that showed the same options for all form inputs should be fully replaced by the type-specific blocks from Tasks 3-7.

**Step 2: Remove unused handlers**

Delete `handleToggleMinLength`, `handleToggleMaxLength`, `handleToggleDefaultValue` toggle handlers (replaced by scrubber handlers). Keep `handleUpdateDefaultValue` and `handleToggleDefaultValue` since Default answer still uses toggle+input for text fields.

Remove unused state/derived values: `hasMinLength`, `hasMaxLength`, `currentMinLength`, `currentMaxLength` (scrubbers read directly from `inputNode`).

**Step 3: Remove unused imports**

Remove `GripVerticalIcon`, `Pencil2Icon`, `Button` if they're only used for the old pattern.

**Step 4: Run linting**

```bash
bun x ultracite fix
```

**Step 5: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "refactor: clean up old generic field options, remove unused code"
```

---

### Task 9: Handle formOptionItem input path resolution

**Files:**

- Modify: `src/components/ui/block-menu.tsx`

**Important edge case:** For `formOptionItem` nodes, the current `getInputPath` logic looks at next/previous sibling for label↔input pairing. But formOptionItem IS the input node — it doesn't have a separate label/input split like other fields. The properties (minSelections, maxSelections, randomizeOrder, allowOther) should be set on the **first** formOptionItem in the group, not on individual options.

**Step 1: Update getInputPath for option items**

When the selected node is a `formOptionItem`, the path should resolve to that node itself (since variant and selection properties live on each option node in the group, or more practically, on the first one):

```typescript
const getInputPath = React.useCallback(() => {
  if (!firstPath) return null;
  if (FORM_INPUT_NODE_TYPES.has(nodeType ?? "")) return firstPath;
  if (nodeType === "formOptionItem") return firstPath;
  if (ALLOWED_LABEL_TYPES.has(nodeType ?? "")) {
    const inputPath = [...firstPath];
    inputPath[inputPath.length - 1] += 1;
    return inputPath;
  }
  return null;
}, [nodeType, firstPath]);
```

**Step 2: Commit**

```bash
git add src/components/ui/block-menu.tsx
git commit -m "fix: resolve input path for formOptionItem nodes in block menu"
```
