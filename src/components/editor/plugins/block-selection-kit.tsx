import { AIChatPlugin } from "@platejs/ai/react";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { getPluginTypes, isHotkey, KEYS } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { BlockSelection } from "@/components/ui/block-selection";

export const BlockSelectionKit = [
  BlockSelectionPlugin.configure(({ editor }) => ({
    options: {
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
          ed.getApi(AIChatPlugin).aiChat.show();
        }
      },
    },
    render: {
      belowRootNodes: (props) => {
        if (!props.attributes.className?.includes("slate-selectable")) return null;

        return <BlockSelection {...(props as PlateElementProps)} />;
      },
    },
  })),
];
