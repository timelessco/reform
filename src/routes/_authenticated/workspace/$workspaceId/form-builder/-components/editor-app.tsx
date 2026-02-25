import { EditorKit } from "@/components/editor/editor-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import type { FormHeaderElementData } from "@/components/ui/form-header-node";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { useEditorHeaderVisibilitySafe } from "@/contexts/editor-header-visibility-context";
import { updateDoc, updateHeader } from "@/db-collections";
import { useForm, useFormSettings } from "@/hooks/use-live-hooks";
import { getThemeStyleVars } from "@/lib/generate-theme-css";
import { cn } from "@/lib/utils";
import { normalizeNodeId, type TElement, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface EditorAppProps {
  formId: string;
  workspaceId?: string;
  defaultValue?: ReturnType<typeof normalizeNodeId>;
  initialForm?: any;
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

export default function EditorApp({
  formId,
  workspaceId,
  versionContent,
  readOnly = false,
}: EditorAppProps) {
  const { data: savedDocs } = useForm(formId);
  const { data: formSettings } = useFormSettings(formId);
  const customization = formSettings?.customization as Record<string, string> | null;
  const hasCustomization = customization && Object.keys(customization).length > 0;
  const themeVars = useMemo(() => getThemeStyleVars(customization), [customization]);
  const skipSaveRef = useRef(false);
  const lastKnownContentRef = useRef<string | null>(null);
  const headerVisibility = useEditorHeaderVisibilitySafe();
  const mountedRef = useRef(false);

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
  }, [versionContent, savedDocs]);

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialContent,
  });

  const lastSavedContentRef = useRef<Value | null>(initialContent);

  // Handle external updates (remote sync changes)
  useEffect(() => {
    if (versionContent) return;
    if (!savedDocs?.length) return;

    const docData = savedDocs[0];
    const incomingContentStr = JSON.stringify(docData?.content);

    // Skip if this is our own change or content hasn't changed
    if (lastKnownContentRef.current === incomingContentStr) return;

    lastKnownContentRef.current = incomingContentStr;
    lastSavedContentRef.current = docData.content as Value;
    skipSaveRef.current = true;
    editor.tf.init({
      value: docData.content as Value,
      autoSelect: "end",
    });
  }, [savedDocs, editor, versionContent]);

  const handleChange = useCallback(
    ({ value }: { value: Value }) => {
      // Skip saving when in read-only mode (viewing a version)
      if (readOnly) return;

      if (skipSaveRef.current) {
        skipSaveRef.current = false;
        return;
      }

      const contentStr = JSON.stringify(value);
      const lastSavedStr = JSON.stringify(lastSavedContentRef.current);
      if (contentStr === lastSavedStr) return;

      lastSavedContentRef.current = value;
      lastKnownContentRef.current = contentStr;
      const now = new Date().toISOString();

      updateDoc(formId, (draft) => {
        draft.workspaceId = workspaceId;
        draft.updatedAt = now;
        draft.content = value;
      });

      if (value.length > 0 && value[0]?.type === "formHeader") {
        const headerNode = value[0] as unknown as FormHeaderElementData;
        updateHeader(formId, {
          title: headerNode.title,
          icon: headerNode.icon ?? undefined,
          cover: headerNode.cover ?? undefined,
          workspaceId: String(workspaceId),
          updatedAt: now,
          createdAt: savedDocs?.[0]?.createdAt ?? "",
        });
      }
    },
    [formId, workspaceId, readOnly, savedDocs],
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

  // Form not found - show error
  if (savedDocs !== undefined && savedDocs.length === 0 && !versionContent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">Loading editor...</div>
    );
  }

  return (
    <div
      className={cn(
        "h-screen w-full overflow-y-auto overflow-x-hidden",
        hasCustomization && "bf-themed",
      )}
      style={hasCustomization ? themeVars : undefined}
    >
      <Plate editor={editor} readOnly={readOnly} onChange={handleChange}>
        <EditorContainer
          variant="default"
          className="px-0 sm:px-0 max-w-full  border-none shadow-none"
        >
          <Editor variant="demo" onKeyDown={handleEditorKeyDown} />
        </EditorContainer>
      </Plate>
    </div>
  );
}
