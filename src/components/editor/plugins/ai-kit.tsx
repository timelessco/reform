import { getPluginType, KEYS, PathApi } from "platejs";
import { usePluginOption } from "platejs/react";

import { AILoadingBar, AIMenu } from "@/components/ui/ai-menu";
import { AIAnchorElement, AILeaf } from "@/components/ui/ai-node";

import { useChat } from "../use-chat";
import { CursorOverlayKit } from "./cursor-overlay-kit";
import { MarkdownKit } from "./markdown-kit";

let _aiModules: typeof import("@platejs/ai") | null = null;
let _aiReactModules: typeof import("@platejs/ai/react") | null = null;

const getAIModules = async () => {
  if (!_aiModules) {
    _aiModules = await import("@platejs/ai");
  }
  return _aiModules;
};

const getAIReactModules = async () => {
  if (!_aiReactModules) {
    _aiReactModules = await import("@platejs/ai/react");
  }
  return _aiReactModules;
};

// Eagerly kick off the dynamic imports when this module is first evaluated
// (i.e., when AI features are actually requested), so they resolve in parallel.
const aiModulesPromise = getAIModules();
const aiReactModulesPromise = getAIReactModules();

export const loadAIKit = async () => {
  const [aiMod, aiReactMod] = await Promise.all([aiModulesPromise, aiReactModulesPromise]);

  const { withAIBatch } = aiMod;
  const { AIChatPlugin, AIPlugin, applyAISuggestions, streamInsertChunk, useChatChunk } =
    aiReactMod;

  const aiChatPlugin = AIChatPlugin.extend({
    options: {
      chatOptions: {
        api: "/api/ai/command",
        body: {},
      },
    },
    render: {
      afterContainer: AILoadingBar,
      afterEditable: AIMenu,
      node: AIAnchorElement,
    },
    shortcuts: { show: { keys: "mod+j" } },
    useHooks: ({ editor, getOption }) => {
      useChat();

      const mode = usePluginOption(AIChatPlugin, "mode");
      const toolName = usePluginOption(AIChatPlugin, "toolName");
      useChatChunk({
        onChunk: ({ chunk, isFirst, nodes, text: content }) => {
          if (isFirst && mode === "insert") {
            editor.tf.withoutSaving(() => {
              editor.tf.insertNodes(
                {
                  children: [{ text: "" }],
                  type: getPluginType(editor, KEYS.aiChat),
                },
                {
                  at: editor.selection?.focus.path
                    ? PathApi.next(editor.selection?.focus.path.slice(0, 1))
                    : undefined,
                },
              );
            });
            editor.setOption(AIChatPlugin, "streaming", true);
          }

          if (mode === "insert" && nodes.length > 0) {
            withAIBatch(
              editor,
              () => {
                if (!getOption("streaming")) return;
                editor.tf.withScrolling(() => {
                  streamInsertChunk(editor, chunk, {
                    textProps: {
                      [getPluginType(editor, KEYS.ai)]: true,
                    },
                  });
                });
              },
              { split: isFirst },
            );
          }

          if (toolName === "edit" && mode === "chat") {
            withAIBatch(
              editor,
              () => {
                applyAISuggestions(editor, content);
              },
              {
                split: isFirst,
              },
            );
          }
        },
        onFinish: () => {
          editor.setOption(AIChatPlugin, "streaming", false);
          editor.setOption(AIChatPlugin, "_blockChunks", "");
          editor.setOption(AIChatPlugin, "_blockPath", null);
          editor.setOption(AIChatPlugin, "_mdxName", null);
        },
      });
    },
  });

  return [...CursorOverlayKit, ...MarkdownKit, AIPlugin.withComponent(AILeaf), aiChatPlugin];
};
