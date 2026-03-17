import { MessageSquareTextIcon } from "@/components/ui/icons";
import { useEditorRef } from "platejs/react";
import { useCallback } from "react";

import { commentPlugin } from "@/components/editor/plugins/comment-kit";

import { ToolbarButton } from "./toolbar";

export const CommentToolbarButton = () => {
  const editor = useEditorRef();

  const handleClick = useCallback(() => {
    editor.getTransforms(commentPlugin).comment.setDraft();
  }, [editor]);

  return (
    <ToolbarButton onClick={handleClick} data-plate-prevent-overlay tooltip="Comment">
      <MessageSquareTextIcon />
    </ToolbarButton>
  );
};
