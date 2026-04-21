# Editor Navigation Simplification — Design

Date: 2026-04-16

## Goal

Simplify editor keyboard navigation to two rules:

- **Enter** → insert a new line / block
- **Tab** → move to the next field

Replace the current two sprawling handlers (`handleGlobalKeyDown` ~200 lines, `handleFormBlockKeyDown` ~260 lines) with a single Tab/Shift+Tab handler plus per-plugin `insertBreak` overrides.

## Target Behavior

| Key         | Block type                                                                            | Action                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tab         | any                                                                                   | Move cursor to next non-button/non-pageBreak/non-formHeader block (crosses page breaks). End of form → no-op. |
| Shift+Tab   | any                                                                                   | Move cursor to previous such block. Start → no-op.                                                            |
| Enter       | formOptionItem                                                                        | Insert new option below                                                                                       |
| Enter       | form field (input/label/email/phone/number/link/date/time/textarea/file/multi-select) | Insert plain `p` below, move cursor into it                                                                   |
| Enter       | paragraph / heading / other                                                           | Plate default (split at cursor)                                                                               |
| Enter       | formButton                                                                            | Blocked natively (void + `isSelectable: false`)                                                               |
| Shift+Enter | any text block                                                                        | Plate default soft newline                                                                                    |
| Arrows      | all                                                                                   | Plate default                                                                                                 |
| Backspace   | form field + edge cases                                                               | Preserved exactly as today                                                                                    |

## Dropped Special Cases

The following behaviors that currently cause surprise are removed:

- Enter-on-label → jump-to-input
- Enter-at-start-with-content → insert paragraph _above_
- Tab at end of form → auto-create empty paragraph before Submit
- Tab on formOptionItem → skip remaining options, jump to next form field
- Enter when next block is a button → special-case insert-before-button
- Duplicated custom arrow-key skip logic (ArrowUp/Down/Left)

## Architecture

### 1. `NavigationPlugin` (new, replaces `GlobalKeyboardNavigationPlugin`)

Single global plugin, priority 1000. Handles Tab and Shift+Tab only.

```ts
onKeyDown: ({ editor, event }) => {
  if (event.key !== "Tab") return;

  const block = editor.api.block();
  if (!block) return;
  const [, path] = block;

  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();

  const target = event.shiftKey
    ? findPrevNonButtonPath(editor, path)
    : findNextNonButtonPath(editor, path);

  if (target) moveToPath(editor, target);
};
```

No Enter handling. No arrow handling. No auto-create.

### 2. `insertBreak` overrides per form-field plugin

Each non-option form field plugin gets the same override via a shared helper:

```ts
const withFormFieldInsertBreak = (plugin) =>
  plugin.overrideEditor(({ editor, tf: { insertBreak } }) => ({
    transforms: {
      insertBreak: () => {
        const block = editor.api.block();
        if (block && FORM_FIELD_TYPES.has(block[0].type) && block[0].type !== "formOptionItem") {
          const nextPath = PathApi.next(block[1]);
          editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: nextPath });
          moveToPath(editor, nextPath);
          return;
        }
        insertBreak();
      },
    },
  }));
```

Applied to: `FormInputPlugin`, `FormLabelPlugin`, `FormEmailPlugin`, `FormPhonePlugin`, `FormNumberPlugin`, `FormLinkPlugin`, `FormDatePlugin`, `FormTimePlugin`, `FormTextareaPlugin`, `FormFileUploadPlugin`, `FormMultiSelectInputPlugin`.

`FormOptionItemPlugin.overrideEditor.insertBreak` — unchanged (already inserts new option).

### 3. `TabGuardPlugin` — unchanged

Still required to short-circuit IndentPlugin when Tab is handled.

### 4. `FormButtonPlugin.extendEditor` — unchanged

All structural protections (deleteBackward/Forward/Fragment, tf.select, tf.insertNodes, moveNodes, normalizeNode) preserved. These are about button/page-break safety, not keyboard UX.

### 5. Backspace handler

Extracted to `handleBackspace(editor, event)`, attached via `onKeyDown` on every form-field plugin. Logic preserved:

- Empty `formOptionItem` + prev label + no next option → convert to `p`
- Empty `formOptionItem` in middle → remove, cursor to end of previous option
- Empty form field with preceding page-break having no other content → remove both, cursor to previous block
- Empty `formButton` → blocked
- Empty form field → remove

### 6. Deletions

Remove from `form-blocks-kit.tsx`:

- `handleGlobalKeyDown` entirely
- `GlobalKeyboardNavigationPlugin`
- `handleFormBlockKeyDown` entirely (replaced by `handleBackspace` + `insertBreak` overrides + `NavigationPlugin`)
- Per-field `onKeyDown: handleFormBlockKeyDown` assignments (replaced with `onKeyDown: handleBackspace`)

## Helpers retained

`findNextNonButtonPath`, `findPrevNonButtonPath`, `moveToPath`, `tryDeletePageBreakWithEmptyBlock`, `FORM_FIELD_TYPES`, `PROTECTED_BUTTON_TYPES`.

## Manual Test Plan

1. Two-page form with radio options: Tab through every field → skips buttons, crosses page break.
2. Tab on last field of final page (no thank-you) → no-op.
3. Tab on last field with thank-you page → lands on thank-you content.
4. Shift+Tab from first field → no-op.
5. Enter inside a label → new paragraph below (not split, not jump-to-input).
6. Enter inside an option → new option below.
7. Enter inside a paragraph with button next → paragraph inserts correctly, button stays at end.
8. Shift+Enter inside a paragraph → soft newline.
9. Backspace on empty option (middle of group; only option after label; between two options).
10. Arrow up/down across buttons and page breaks — cursor skips buttons naturally.
11. Slash menu / autoformat / AI menus — Tab/Enter inside still select menu items.

## Out of Scope

- Mobile / virtual keyboard behavior
- Keyboard shortcuts for indent/outdent inside lists (these are already handled by IndentPlugin and continue to work outside form fields)
- Accessibility improvements beyond native Plate
