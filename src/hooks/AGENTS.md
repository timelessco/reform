# AGENTS: src/hooks

## OVERVIEW

React hooks providing form builder state management, local-first synchronization, and UI utility logic for the Better Forms editor and runtime.

## WHERE TO LOOK

- **Form State Management**:
  - `use-form-state.ts`: Primary hook for accessing local IndexedDB via TanStack DB.
  - `use-preview-form.ts`: Lifecycle management for the Plate.js-to-TanStack Form transformation.
  - `use-form-builder.ts`: Core type definitions for form instances and field components.
- **Initialization & Sync**:
  - `use-workspace-init.ts`: App-level hook for workspace setup and orphan form migration.
- **File Handling**:
  - `use-file-upload.ts`: Client-side logic for drag-and-drop, validation, and local previews.
  - `use-upload-file.ts`: Higher-level integration with the UploadThing cloud service.
- **UI Logic & Navigation**:
  - `use-stepper.tsx`: Orchestrates multi-step validation, back/next navigation, and final submission.
  - `use-customize-sidebar.ts`: Manages the builder's customization sidebar state via an external store.
- **Environment Utilities**:
  - `use-mobile.ts`: Viewport-based breakpoint detection.
  - `use-is-touch-device.ts`: Detection for touch-capable screens.
  - `use-mounted.ts`: Basic hydration tracking for client-only logic.
  - `use-debounce.ts`: Standard debouncing for input-heavy operations.

## CONVENTIONS

- **Local-First Persistence**: State (forms, workspaces) is synced via `useLiveQuery` from `@tanstack/react-db`, ensuring a snappy, offline-capable experience.
- **Hydration Safety**: Use the `useIsClient` pattern (found in `use-workspace-init.ts`) or the `useMounted` hook to gate browser-only logic (window, document, IndexedDB) during SSR.
- **Stateless Transformations**: Complex logic for generating Zod schemas or default values is kept in `lib/`, with hooks acting as the bridge for TanStack Form's lifecycle.
- **Micro-Stores**: Shared UI state that isn't globally relevant uses `useSyncExternalStore` for optimized, framework-agnostic management (e.g., `useCustomizeSidebar`).

## ANTI-PATTERNS

- **Direct Collection Access**: Avoid performing mutations on `editorDocCollection` directly in components; always use services or hooks to maintain state consistency.
- **SSR Leaks**: Accessing `window`, `document`, or `navigator` at the top level of a hook without a client-side guard, which causes hydration mismatches or server crashes.
- **Logic Duplication**: Implementing field validation logic inside a component hook that should reside in the centralized `lib/generate-preview-schema.ts`.

## KEY HOOKS

- **`useFormState`**: The backbone of the builder; it provides live, reactive access to form documents while handling server/client isomorphism.
- **`usePreviewForm`**: A high-complexity hook that transmutes Plate.js editor node trees into functional TanStack Form instances with dynamic Zod validation.
- **`useWorkspaceInit`**: Critical app-level hook that partitions the local database and migrates "orphan" forms to the default workspace on the first application load.
- **`useFormStepper`**: Manages the orchestration of multi-step forms, including per-step Zod validation, error handling, and navigation state transitions.
