import { BlockSelectionPlugin } from "@platejs/selection/react";
import { getPluginTypes, isHotkey, KEYS } from "platejs";
import type { ComponentProps } from "react";

import { triggerAIInput } from "@/components/editor/plugins/ai-input-kit";
import { BlockSelection } from "@/components/ui/block-selection";

export const BlockSelectionKit = [
  BlockSelectionPlugin.configure(({ editor }) => ({
    options: {
      // Point viselect at real scroll container so drag-select auto-scrolls near viewport edge.
      areaOptions: {
        boundaries: "[data-editor-scroll]",
        container: "[data-editor-scroll]",
      },
      enableContextMenu: true,
      isSelectable: (element) =>
        !getPluginTypes(editor, [
          KEYS.column,
          KEYS.codeLine,
          KEYS.td,
          "formHeader",
          "formButton",
        ]).includes(element.type),
      onKeyDownSelecting: (ed, e) => {
        if (isHotkey("mod+j")(e)) {
          e.preventDefault();
          triggerAIInput(ed);
        }
      },
    },
    render: {
      // SAFETY: belowRootNodes carries the same plugin object BlockSelection reads;
      // the type gap is duplicate package instances, and only plugin.key is read.
      belowRootNodes: (props) => (
        <BlockSelection {...(props as ComponentProps<typeof BlockSelection>)} />
      ),
    },
  })),
];
