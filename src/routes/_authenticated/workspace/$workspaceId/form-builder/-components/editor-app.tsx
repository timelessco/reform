import { EditorKit } from "@/components/editor/editor-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import type { FormHeaderElementData } from "@/components/ui/form-header-node";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { useEditorHeaderVisibilitySafe } from "@/contexts/editor-header-visibility-context";
import { EditorThemeProvider } from "@/contexts/editor-theme-context";
import { getFormDetail } from "@/db-collections/collections";
import type { Form } from "@/db-collections/collections";
import { useFormCustomization } from "@/hooks/use-form-customization";
import { useForm } from "@/hooks/use-live-hooks";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "@/components/ui/icons";
import { normalizeNodeId } from "platejs";
import type { TElement, Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface EditorAppProps {
  formId: string;
  workspaceId?: string;
  defaultValue?: ReturnType<typeof normalizeNodeId>;
  initialForm?: unknown;
  versionContent?: Value;
  readOnly?: boolean;
}

const DEFAULT_EDITOR_VALUE = normalizeNodeId([
  createFormHeaderNode() as unknown as TElement,
  {
    children: [{ text: "" }],
    type: "p",
  },
  createFormButtonNode("submit") as unknown as TElement,
]);

/**
 * Outer component: fetches data and guards against rendering
 * the editor before the collection data has loaded.
 *
 * This split is necessary because React hooks always execute regardless
 * of early returns. Without it, `usePlateEditor` would be called with
 * DEFAULT_EDITOR_VALUE on the first render (while data is loading),
 * and the editor would never update because `resetKey` doesn't change.
 */
const EditorApp = ({ formId, workspaceId, versionContent, readOnly = false }: EditorAppProps) => {
  const { data: savedDocsRaw, isReady: isFormReady } = useForm(formId);
  // Query-backed FormDetail is structurally compatible with Form at runtime
  const savedDocs = savedDocsRaw as Form[] | undefined;

  // Guard: don't mount the editor until we have actual form data
  if (!versionContent && !savedDocs?.length) {
    // Collection ready but form not found → genuinely doesn't exist
    if (isFormReady) {
      return (
        <div className="h-full w-full flex items-center justify-center">Loading editor...</div>
      );
    }
    // Still syncing → show spinner
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorAppInner
      formId={formId}
      workspaceId={workspaceId}
      versionContent={versionContent}
      readOnly={readOnly}
      savedDocs={savedDocs}
    />
  );
};
export default EditorApp;

/**
 * Inner component: only mounts once data is available.
 * `usePlateEditor` is guaranteed to receive real content from its first call.
 */
const EditorAppInner = ({
  formId,
  workspaceId,
  versionContent,
  readOnly,
  savedDocs,
}: {
  formId: string;
  workspaceId?: string;
  versionContent?: Value;
  readOnly: boolean;
  savedDocs: Form[] | undefined;
}) => {
  const { customization, hasCustomization, themeVars } = useFormCustomization(savedDocs?.[0]);

  // Sync editor mode when app theme changes (user menu, settings)
  const { theme } = useTheme();
  const resolvedAppTheme =
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  useEffect(() => {
    if (resolvedAppTheme !== customization?.mode && formId) {
      getFormDetail(formId).update(formId, (draft) => {
        const current = (draft.customization ?? {}) as Record<string, string>;
        draft.customization = { ...current, mode: resolvedAppTheme };
        draft.updatedAt = new Date().toISOString();
      });
    }
  }, [resolvedAppTheme, customization?.mode, formId]);

  const skipSaveRef = useRef(false);
  const lastKnownContentRef = useRef<string | null>(null);
  const savedDocsRef = useRef(savedDocs);
  savedDocsRef.current = savedDocs;
  const pendingValueRef = useRef<Value | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const headerVisibility = useEditorHeaderVisibilitySafe();
  const [resetKey, setResetKey] = useState(0);

  // Detect external content change (discard, remote sync) and recreate editor.
  // setState during render is a documented React pattern — React aborts this
  // render and immediately re-renders with the new state.
  // Skip detection while we have a pending save — the sync-back is our own edit.
  if (!versionContent && savedDocs?.length && !pendingValueRef.current) {
    const contentStr = JSON.stringify(savedDocs[0]?.content);
    if (lastKnownContentRef.current === null) {
      lastKnownContentRef.current = contentStr;
    } else if (lastKnownContentRef.current !== contentStr) {
      setResetKey((k) => k + 1);
      lastKnownContentRef.current = contentStr;
      skipSaveRef.current = true;
    }
  }

  // Compute initial content from liveQuery - single source of truth
  const initialContent = useMemo(() => {
    // Version content takes priority (read-only viewing)
    if (versionContent) return versionContent;

    const docData = savedDocs?.[0];
    if (!docData?.content || !Array.isArray(docData.content)) {
      return DEFAULT_EDITOR_VALUE;
    }

    let content: Value;

    if (docData.content.length > 0 && docData.content[0]?.type === "formHeader") {
      content = docData.content as Value;
    } else {
      // Add formHeader at index 0 with data from doc metadata
      content = [
        createFormHeaderNode({
          title: docData.title || "",
          icon: docData.icon || null,
          cover: docData.cover || null,
        }) as unknown as TElement,
        ...(docData.content as Value),
      ];
    }

    // Migration: ensure Submit button exists for existing forms
    const hasSubmitButton = content.some(
      (node: TElement) => node.type === "formButton" && node.buttonRole === "submit",
    );
    if (!hasSubmitButton) {
      const thankYouIndex = content.findIndex(
        (node: TElement) => node.type === "pageBreak" && node.isThankYouPage === true,
      );
      const insertIndex = thankYouIndex !== -1 ? thankYouIndex : content.length;
      content = [
        ...content.slice(0, insertIndex),
        createFormButtonNode("submit") as unknown as TElement,
        ...content.slice(insertIndex),
      ];
    }

    return content;
    // eslint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps -- savedDocs intentionally excluded; resetKey triggers recompute
  }, [versionContent, resetKey]);

  const editor = usePlateEditor(
    {
      plugins: EditorKit,
      value: initialContent,
    },
    [resetKey],
  );

  const handleChange = useCallback(
    ({ value }: { value: Value }) => {
      if (readOnly) return;

      if (skipSaveRef.current) {
        skipSaveRef.current = false;
        return;
      }

      pendingValueRef.current = value;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const val = pendingValueRef.current;
        if (!val) return;

        const headerNode =
          val.length > 0 && val[0]?.type === "formHeader"
            ? (val[0] as unknown as FormHeaderElementData)
            : null;

        // Update the ref so external-change detection recognizes
        // the upcoming sync-back as our own edit
        lastKnownContentRef.current = JSON.stringify(val);
        pendingValueRef.current = null;

        getFormDetail(formId).update(formId, (draft) => {
          draft.content = val;
          if (workspaceId) draft.workspaceId = workspaceId;
          draft.updatedAt = new Date().toISOString();
          if (headerNode) {
            if (headerNode.title !== undefined) draft.title = headerNode.title;
            if (headerNode.icon !== undefined) draft.icon = headerNode.icon ?? null;
            if (headerNode.cover !== undefined) draft.cover = headerNode.cover ?? null;
          }
        });
      }, 500);
    },
    [formId, workspaceId, readOnly],
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (readOnly || !headerVisibility?.enabled) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key;
      const isPrintable = key.length === 1;
      const isTypingIntentKey =
        isPrintable ||
        key === "Enter" ||
        key === "Backspace" ||
        key === "Delete" ||
        key === " " ||
        key === "Spacebar";

      if (!isTypingIntentKey) return;
      headerVisibility.reportTyping();
    },
    [readOnly, headerVisibility],
  );

  const updateThemeColor = useCallback(
    (themeColor: string) => {
      if (formId) {
        getFormDetail(formId).update(formId, (draft) => {
          const current = (draft.customization ?? {}) as Record<string, string>;
          draft.customization = { ...current, themeColor, preset: "custom" };
          draft.updatedAt = new Date().toISOString();
        });
      }
    },
    [formId],
  );

  const themeCtx = useMemo(
    () => ({
      themeVars,
      hasCustomization: Boolean(hasCustomization),
      customization,
      updateThemeColor: hasCustomization ? updateThemeColor : undefined,
    }),
    [themeVars, hasCustomization, customization, updateThemeColor],
  );

  return (
    <EditorThemeProvider value={themeCtx}>
      <div
        className={cn(
          "min-h-full w-full overflow-x-hidden bg-background text-foreground",
          hasCustomization && "bf-themed",
          customization?.mode === "dark" && "dark",
        )}
        style={hasCustomization ? themeVars : undefined}
      >
        <Plate editor={editor} readOnly={readOnly} onChange={handleChange}>
          <EditorContainer
            variant="default"
            className="px-0 sm:px-0 max-w-full border-none shadow-none overflow-y-visible"
          >
            <Editor variant="demo" className="rounded-none" onKeyDown={handleEditorKeyDown} />
          </EditorContainer>
        </Plate>
      </div>
    </EditorThemeProvider>
  );
};
