import { BlockMenuPlugin } from "@platejs/selection/react";

import { BlockMenu } from "@/components/ui/block-menu";

import { BlockSelectionKit } from "./block-selection-kit";

export const BlockMenuKit = [
  ...BlockSelectionKit,
  BlockMenuPlugin.configure({
    render: { aboveEditable: BlockMenu },
  }),
];
