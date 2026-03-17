import { insertInlineEquation } from "@platejs/math";
import { RadicalIcon } from "@/components/ui/icons";
import { useEditorRef } from "platejs/react";
import { useCallback } from "react";
import type * as React from "react";

import { ToolbarButton } from "./toolbar";

export const InlineEquationToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const editor = useEditorRef();

  const handleClick = useCallback(() => {
    insertInlineEquation(editor);
  }, [editor]);

  return (
    <ToolbarButton {...props} onClick={handleClick} tooltip="Mark as equation">
      <RadicalIcon />
    </ToolbarButton>
  );
};
