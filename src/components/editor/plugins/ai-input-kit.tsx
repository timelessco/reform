import { AIPlugin } from "@platejs/ai/react";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { isHotkey, KEYS, NodeApi, PathApi } from "platejs";
import type { SlateEditor, TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";

import { AIInputElement } from "@/components/ui/ai-input-node";

const isEmptyParagraph = (editor: SlateEditor): boolean => {
  const block = editor.api.block();
  if (!block) return false;
  const [node] = block;
  return node.type === KEYS.p && NodeApi.string(node).length === 0;
};

type AIInputContext = {
  selectionContext: string | null;
  selectedPaths: number[][];
  insertAt: number[];
  replace?: boolean;
};

const captureContext = (editor: SlateEditor): AIInputContext => {
  let selectionContext: string | null = null;
  let selectedPaths: number[][] = [];
  let insertAt: number[] = [];

  const blockSelectionNodes = editor
    .getApi(BlockSelectionPlugin)
    .blockSelection.getNodes({ selectionFallback: false, sort: true });

  if (blockSelectionNodes && blockSelectionNodes.length > 0) {
    selectedPaths = blockSelectionNodes.map((entry: [unknown, number[]]) => [...entry[1]]);
    const lastPath = selectedPaths[selectedPaths.length - 1];
    insertAt = PathApi.next(lastPath);

    const parts: string[] = [];
    for (const entry of blockSelectionNodes) {
      try {
        const text = NodeApi.string(entry[0] as TElement).trim();
        if (text) parts.push(text);
      } catch {
        // skip
      }
    }
    if (parts.length > 0) selectionContext = parts.join("\n");
    return { selectionContext, selectedPaths, insertAt };
  }

  const block = editor.api.block();
  if (editor.selection && editor.api.isExpanded()) {
    try {
      const text = editor.api.string(editor.selection).trim();
      if (text) selectionContext = text;
    } catch {
      // skip
    }
    insertAt = block ? PathApi.next(block[1]) : [editor.children.length];
    return { selectionContext, selectedPaths, insertAt };
  }

  insertAt = block ? PathApi.next(block[1]) : [editor.children.length];
  // If cursor is in an empty paragraph, replace it instead of inserting after
  if (block) {
    const [node, path] = block;
    if (node.type === KEYS.p && NodeApi.string(node).length === 0) {
      return { selectionContext, selectedPaths, insertAt: path, replace: true };
    }
  }
  return { selectionContext, selectedPaths, insertAt };
};

export const triggerAIInput = (editor: SlateEditor) => {
  const ctx = captureContext(editor);
  const node = {
    type: "ai_input",
    children: [{ text: "" }],
    selectionContext: ctx.selectionContext,
    selectedPaths: ctx.selectedPaths,
  } as unknown as TElement;

  editor.tf.withoutSaving(() => {
    if (ctx.replace) {
      editor.tf.setNodes(node, { at: ctx.insertAt });
    } else {
      editor.tf.insertNodes(node, { at: ctx.insertAt });
    }
  });
};

export const AIInputPlugin = createPlatePlugin({
  key: "ai_input",
  options: { formId: "" as string },
  node: {
    isElement: true,
    isVoid: true,
    type: "ai_input",
  },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      if (isHotkey("mod+j")(event)) {
        event.preventDefault();
        triggerAIInput(editor);
        return;
      }
      if (event.key === " " && isEmptyParagraph(editor)) {
        event.preventDefault();
        const block = editor.api.block();
        if (!block) return;
        const [, path] = block;
        editor.tf.withoutSaving(() => {
          editor.tf.setNodes({ type: "ai_input", children: [{ text: "" }] }, { at: path });
        });
      }
    },
  },
}).withComponent(AIInputElement);

export const AIInputKit = [AIPlugin, AIInputPlugin];
