import { DndPlugin } from "@platejs/dnd";
import { PlaceholderPlugin } from "@platejs/media/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { BlockDraggable } from "@/components/ui/block-draggable";

// Lazy ref that finds the scroll container at access time
const scrollContainerRef = {
  get current() {
    return document.querySelector("[data-editor-scroll]") as HTMLElement | null;
  },
};

export const DndKit = [
  DndPlugin.configure({
    options: {
      enableScroller: true,
      scrollerProps: {
        containerRef: scrollContainerRef as React.RefObject<HTMLElement>,
      },
      onDropFiles: ({ dragItem, editor, target }) => {
        editor
          .getTransforms(PlaceholderPlugin)
          .insert.media(dragItem.files, { at: target, nextBlock: false });
      },
    },
    render: {
      aboveNodes: BlockDraggable,
      aboveSlate: ({ children }) => <DndProvider backend={HTML5Backend}>{children}</DndProvider>,
    },
  }),
];
