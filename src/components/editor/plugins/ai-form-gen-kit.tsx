import { useChat } from "@ai-sdk/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { DefaultChatTransport } from "ai";
import { PathApi } from "platejs";
import type { TElement } from "platejs";
import { createPlatePlugin, useEditorRef, usePluginOption } from "platejs/react";
import { useCallback, useRef } from "react";

import { AIFormGenBubble } from "@/components/ui/ai-form-gen-bubble";
import { SparklesIcon } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildFormBlockNodes, buildFormSectionNodes } from "@/lib/editor/ai-form-nodes";

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
  options: { isOpen: false as boolean },
  shortcuts: {
    toggle: {
      keys: "mod+shift+g",
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
      }
    },
    onFinish: () => {
      insertPathRef.current = null;
      editor.setOption(AIFormGenPlugin, "isOpen", false);
    },
    onError: () => {
      insertPathRef.current = null;
    },
  });

  const handleSubmit = useCallback(
    (prompt: string) => {
      insertPathRef.current = null;
      sendMessage({ text: prompt });
    },
    [sendMessage],
  );

  const handleClose = useCallback(() => {
    editor.setOption(AIFormGenPlugin, "isOpen", false);
    insertPathRef.current = null;
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                  aria-label="AI Form Generator"
                />
              }
            >
              <SparklesIcon className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>AI Form Generator</p>
              <p className="text-xs text-muted-foreground">⌘⇧G</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      {isOpen && (
        <AIFormGenBubble
          onSubmit={handleSubmit}
          onClose={handleClose}
          isGenerating={isGenerating}
        />
      )}
    </>
  );
};

export const AIFormGenKit = [AIFormGenPlugin];
