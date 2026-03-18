import { LineHeightPlugin } from "@platejs/basic-styles/react";

import { WrapTextIcon } from "@/components/ui/icons";
import { useEditorRef, useSelectionFragmentProp } from "platejs/react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ToolbarButton } from "./toolbar";

export const LineHeightToolbarButton = (props: React.ComponentProps<typeof DropdownMenu>) => {
  const editor = useEditorRef();
  const { defaultNodeValue, validNodeValues: values = [] } =
    editor.getInjectProps(LineHeightPlugin);

  const value = useSelectionFragmentProp({
    defaultValue: defaultNodeValue,
    getProp: (node) => node.lineHeight,
  });

  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger
        render={<ToolbarButton pressed={open} tooltip="Line height" isDropdown />}
      >
        <WrapTextIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-0" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            editor.getTransforms(LineHeightPlugin).lineHeight.setNodes(Number(newValue));
            editor.tf.focus();
          }}
        >
          {values.map((val) => (
            <DropdownMenuRadioItem key={val} className="min-w-[180px] pl-2" value={val}>
              {val}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
