import { useChat } from "@ai-sdk/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { DefaultChatTransport } from "ai";
import { PathApi } from "platejs";
import type { TElement } from "platejs";
import { createPlatePlugin, useEditorRef, usePluginOption } from "platejs/react";
import { useCallback, useRef } from "react";

import { AIFormGenBubble } from "@/components/ui/ai-form-gen-bubble";
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
      keys: "mod+shift+a",
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

  const insertNodesAtPath = useCallback(
    (nodes: TElement[]) => {
      if (!insertPathRef.current) {
        const block = editor.api.block();
        if (block) {
          const [, path] = block;
          insertPathRef.current = PathApi.next(path);
        } else {
          insertPathRef.current = [0];
        }
      }

      for (const node of nodes) {
        editor.tf.insertNodes(node, { at: insertPathRef.current });
        insertPathRef.current = PathApi.next(insertPathRef.current);
      }
    },
    [editor],
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

  if (!isOpen) {
    return null;
  }

  const isGenerating = status === "streaming" || status === "submitted";

  return (
    <AIFormGenBubble onSubmit={handleSubmit} onClose={handleClose} isGenerating={isGenerating} />
  );
};

export const AIFormGenKit = [AIFormGenPlugin];
