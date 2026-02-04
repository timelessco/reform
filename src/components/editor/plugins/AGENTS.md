# EDITOR PLUGINS KNOWLEDGE BASE

## OVERVIEW

Modular Plate.js plugin architecture using a "Kit" pattern to separate base/static functionality from interactive React features.

## WHERE TO LOOK

| Task                 | Location                                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| Define new plugin    | `src/components/editor/plugins/` (create `*-base-kit.tsx` and `*-kit.tsx`) |
| Node transformations | `src/components/editor/transforms.ts`                                      |
| AI / Chat behavior   | `src/components/editor/use-chat.ts`                                        |
| Form block logic     | `src/components/editor/plugins/form-blocks-kit.tsx`                        |
| Custom node UI       | `src/components/ui/` (e.g., `form-input-node.tsx`)                         |

## CONVENTIONS

- **Kit Pattern**:
  - `*-base-kit.tsx`: Exports `Base*Kit` for static/SSR rendering or core plugin logic.
  - `*-kit.tsx`: Exports `*Kit` with interactive `render.node` components and toolbars.
- **Plugin Registration**: Plugins are instantiated via `createPlatePlugin` or `.configure()`.
- **Event Handling**: Form blocks use a custom `__formBlockHandled` property on events to prevent double-processing.
- **Type Handling**: Custom form nodes (formInput, formLabel) often require `as any` or `as TElement` during `editor.tf` operations.

## ANTI-PATTERNS

- **Type Safety**: Extensive use of `as any` in `transforms.ts` and `form-blocks-kit.tsx` bypasses Slate's schema validation.
- **Logic Bloat**: Placing complex business logic directly in `render.node` instead of using custom hooks or the `use-chat.ts` hub.
- **Selection API**: Using native `window.getSelection()` instead of `editor.api` or `editor.tf`.

## KEY FILES

- **`src/components/editor/use-chat.ts`**: (1514 lines) Hotspot for AI features, streaming, and command processing.
- **`src/components/editor/transforms.ts`**: Centralized node insertion logic; contains complex multi-node insertions for form fields.
- **`src/components/editor/plugins/form-blocks-kit.tsx`**: Manages keyboard navigation (Tab/Enter) and state for form-specific components.
- **`src/components/editor/plugins/ai-kit.tsx`**: Core configuration for `AIChatPlugin` and content generation.
- **`src/components/editor/plugins/`**: 59 files implementing the modular plugin architecture.
