import { AIChatPlugin } from "@platejs/ai/react";
import { useEditorPlugin } from "platejs/react";
import { useCallback } from "react";
import type * as React from "react";

import { ToolbarButton } from "./toolbar";

export const AIToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const { api } = useEditorPlugin(AIChatPlugin);

  const handleClick = useCallback(() => {
    api.aiChat.show();
  }, [api.aiChat]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return <ToolbarButton {...props} onClick={handleClick} onMouseDown={handleMouseDown} />;
};
