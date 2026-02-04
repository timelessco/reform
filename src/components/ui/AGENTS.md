# UI COMPONENTS KNOWLEDGE BASE (src/components/ui)

## OVERVIEW

166 files providing Shadcn/Radix-based UI atoms and complex Plate.js-integrated editor components.

## WHERE TO LOOK

| Task                       | Path                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| Sidebar & Navigation       | `sidebar.tsx`, `app-header.tsx`, `customize-sidebar.tsx`                          |
| Editor UI (Menus/Toolbars) | `ai-menu.tsx`, `block-menu.tsx`, `toolbar.tsx`, `floating-toolbar.tsx`            |
| Editor Node Views          | `table-node.tsx`, `form-header-node.tsx`, `code-block-node.tsx`, `image-node.tsx` |
| Custom SVG Icons           | `table-icons.tsx`                                                                 |
| Primitive UI Atoms         | `button.tsx`, `input.tsx`, `sheet.tsx`, `popover.tsx`, `dialog.tsx`               |

## CONVENTIONS

- **Imports**: Always use `@/components/ui/*` alias for internal and external consumption.
- **Styling**: Tailwind CSS 4 with OKLCH colors (e.g., `text-primary`, `bg-background`).
- **Composition**: Use `cn()` utility for class merging; follow Radix/Shadcn "Slot" patterns.
- **Plate Integration**: Editor-specific UI components rely on `@platejs/*` hooks and state.

## ANTI-PATTERNS

- **Magic Specificity**: Avoid `!` (important) modifiers; use proper nesting or layout primitives.
- **Hardcoded Colors**: Never use hex/rgb; use CSS variables defined in `src/styles.css`.
- **Duplicate Icons**: Check `table-icons.tsx` or `lucide-react` before adding new SVGs.
- **Prop Drilling**: Prefer Radix/Plate context providers for deep component states.

## KEY COMPONENTS

| File                            | Lines | Role                                                                      |
| ------------------------------- | ----- | ------------------------------------------------------------------------- |
| `table-icons.tsx`               | 860   | Centralized SVG icon library for advanced table operations.               |
| `font-color-toolbar-button.tsx` | 828   | Complex color picker and toolbar button logic for rich text.              |
| `sidebar.tsx`                   | 728   | Main app sidebar with cookie-persisted state and mobile responsive logic. |
| `ai-menu.tsx`                   | 722   | Plate AI chat integration, command palette, and streaming response UI.    |
| `table-node.tsx`                | 654   | High-complexity rendering and interaction logic for editor tables.        |
