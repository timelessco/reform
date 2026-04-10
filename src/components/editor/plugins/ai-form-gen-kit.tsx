import { useChat } from "@ai-sdk/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { DefaultChatTransport } from "ai";
import { PathApi } from "platejs";
import type { TElement } from "platejs";
import { createPlatePlugin, useEditorRef, usePluginOption } from "platejs/react";
import { useCallback, useRef, useState } from "react";

import { AIFormGenBubble } from "@/components/ui/ai-form-gen-bubble";
import { SparklesIcon } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildFormBlockNodes, buildFormSectionNodes } from "@/lib/editor/ai-form-nodes";
import { matchIcon } from "@/lib/editor/ai-icon-matcher";

type FormBlockArgs = {
  fieldType: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

type FormSectionArgs = {
  title: string;
  level?: 1 | 2 | 3;
};

export const AIFormGenPlugin = createPlatePlugin({
  key: "aiFormGen",
  options: { isOpen: false as boolean, formId: "" as string },
  shortcuts: {
    toggle: {
      keys: "mod+shift+k",
      handler: ({ editor }) => {
        const current = editor.getOption(AIFormGenPlugin, "isOpen");
        editor.setOption(AIFormGenPlugin, "isOpen", !current);
      },
    },
  },
  render: {
    afterEditable: () => <AIFormGenMenu />,
  },
});

const AIFormGenMenu = () => {
  const editor = useEditorRef();
  const isOpen = usePluginOption(AIFormGenPlugin, "isOpen");
  const insertPathRef = useRef<number[] | null>(null);
  const insertedCountRef = useRef(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const getEditorMarkdown = useCallback((): string => {
    try {
      return editor.getApi(MarkdownPlugin).markdown.serialize();
    } catch {
      return "";
    }
  }, [editor]);

  // Capture cursor position when the bubble opens (before focus shifts to input)
  const capturedPathRef = useRef<number[] | null>(null);
  if (isOpen && !capturedPathRef.current) {
    const block = editor.api.block();
    if (block) {
      const [, path] = block;
      capturedPathRef.current = PathApi.next(path);
    } else {
      // Fallback: insert at the end of the document
      capturedPathRef.current = [editor.children.length];
    }
  } else if (!isOpen) {
    capturedPathRef.current = null;
  }

  const insertNodesAtPath = useCallback(
    (nodes: TElement[]) => {
      if (!insertPathRef.current) {
        insertPathRef.current = capturedPathRef.current ?? [editor.children.length];
      }

      for (const node of nodes) {
        editor.tf.insertNodes(node, { at: insertPathRef.current });
        insertPathRef.current = PathApi.next(insertPathRef.current);
        insertedCountRef.current++;
      }
    },
    [editor, capturedPathRef],
  );

  const { sendMessage, status } = useChat({
    id: "ai-form-gen",
    transport: new DefaultChatTransport({
      api: "/api/ai/form-generate",
      body: () => ({ editorContent: getEditorMarkdown() }),
    }),
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "addFormBlock") {
        const nodes = buildFormBlockNodes(toolCall.input as FormBlockArgs);
        insertNodesAtPath(nodes);
      } else if (toolCall.toolName === "addFormSection") {
        const nodes = buildFormSectionNodes(toolCall.input as FormSectionArgs);
        insertNodesAtPath(nodes);
      } else if (toolCall.toolName === "setFormHeader") {
        const { title, iconKeyword, coverColor } = toolCall.input as {
          title?: string;
          iconKeyword?: string;
          coverColor?: string;
        };
        const headerNode = editor.children[0] as TElement;
        if (headerNode?.type === "formHeader") {
          const updates: Record<string, unknown> = {};
          if (title) updates.title = title;
          if (iconKeyword) {
            const iconName = matchIcon(iconKeyword);
            if (iconName) updates.icon = iconName;
          }
          if (coverColor) updates.cover = coverColor;
          editor.tf.setNodes(updates, { at: [0] });
        }
      } else if (toolCall.toolName === "setFormTheme") {
        const { tokens, font, radius } = toolCall.input as {
          tokens?: Record<string, string>;
          font?: string;
          radius?: string;
        };
        const formId = editor.getOption(AIFormGenPlugin, "formId");
        if (!formId) return;
        import("@/collections").then(({ getFormListings }) => {
          const collection = getFormListings();
          if (!collection.get(formId)) return;
          collection.update(formId, (draft) => {
            const current = (draft.customization ?? {}) as Record<string, string>;
            const next: Record<string, string> = { ...current, preset: "custom" };
            if (tokens) {
              for (const [key, value] of Object.entries(tokens)) {
                next[key] = value;
              }
            }
            if (font) next.font = font;
            if (radius) next.radius = radius;
            draft.customization = next;
            draft.updatedAt = new Date().toISOString();
          });
        });
      }
    },
    onFinish: () => {
      insertedCountRef.current = 0;
      insertPathRef.current = null;
      editor.setOption(AIFormGenPlugin, "isOpen", false);
    },
    onError: () => {
      // Rollback: undo all inserted nodes by calling editor.undo() for each
      const count = insertedCountRef.current;
      if (count > 0) {
        editor.tf.withoutNormalizing(() => {
          for (let i = 0; i < count; i++) {
            editor.tf.undo();
          }
        });
      }
      insertedCountRef.current = 0;
      insertPathRef.current = null;
      setGenerationError("Generation failed. Changes have been rolled back.");
    },
  });

  const handleSubmit = useCallback(
    (prompt: string) => {
      insertPathRef.current = null;
      insertedCountRef.current = 0;
      setGenerationError(null);
      sendMessage({ text: prompt });
    },
    [sendMessage],
  );

  const handleClose = useCallback(() => {
    editor.setOption(AIFormGenPlugin, "isOpen", false);
    insertPathRef.current = null;

    // Plate preserves editor.selection even when DOM focus leaves the editor.
    // Just refocus — it will restore to the existing selection automatically.
    setTimeout(() => {
      editor.tf.focus();
    }, 0);
  }, [editor]);

  const isGenerating = status === "streaming" || status === "submitted";

  const handleToggle = useCallback(() => {
    editor.setOption(AIFormGenPlugin, "isOpen", !isOpen);
  }, [editor, isOpen]);

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={handleToggle}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                  aria-label="AI Form Generator"
                />
              }
            >
              <SparklesIcon className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>AI Form Generator</p>
              <p className="text-xs text-muted-foreground">⌘⇧K</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      {isOpen && (
        <AIFormGenBubble
          onSubmit={handleSubmit}
          onClose={handleClose}
          isGenerating={isGenerating}
          error={generationError}
        />
      )}
    </>
  );
};

export const AIFormGenKit = [AIFormGenPlugin];
