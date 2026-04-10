import { AIFormGenPlugin } from "@/components/editor/plugins/ai-form-gen-kit";
import { useEditorPlugin } from "platejs/react";
import { useCallback } from "react";

import { ToolbarButton } from "./toolbar";

export const AIFormGenToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const { editor } = useEditorPlugin(AIFormGenPlugin);

  const handleClick = useCallback(() => {
    const current = editor.getOption(AIFormGenPlugin, "isOpen");
    editor.setOption(AIFormGenPlugin, "isOpen", !current);
  }, [editor]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return <ToolbarButton {...props} onClick={handleClick} onMouseDown={handleMouseDown} />;
};
