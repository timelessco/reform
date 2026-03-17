import { useToggleToolbarButton, useToggleToolbarButtonState } from "@platejs/toggle/react";
import { ListCollapseIcon } from "@/components/ui/icons";
import type * as React from "react";

import { ToolbarButton } from "./toolbar";

export const ToggleToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const state = useToggleToolbarButtonState();
  const { props: buttonProps } = useToggleToolbarButton(state);

  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Toggle">
      <ListCollapseIcon />
    </ToolbarButton>
  );
};
