import type { Alignment } from "@platejs/basic-styles";
import { TextAlignPlugin } from "@platejs/basic-styles/react";
import { AlignJustifyIcon } from "lucide-react";
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "@/components/ui/icons";
import { useEditorPlugin, useSelectionFragmentProp } from "platejs/react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ToolbarButton } from "./toolbar";

const items = [
  {
    icon: AlignLeftIcon,
    value: "left",
  },
  {
    icon: AlignCenterIcon,
    value: "center",
  },
  {
    icon: AlignRightIcon,
    value: "right",
  },
  {
    icon: AlignJustifyIcon,
    value: "justify",
  },
];

export const AlignToolbarButton = (props: React.ComponentProps<typeof DropdownMenu>) => {
  const { editor, tf } = useEditorPlugin(TextAlignPlugin);
  const value =
    useSelectionFragmentProp({
      defaultValue: "start",
      getProp: (node) => node.align,
    }) ?? "left";

  const [open, setOpen] = React.useState(false);
  const IconValue = items.find((item) => item.value === value)?.icon ?? AlignLeftIcon;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      tf.textAlign.setNodes(newValue as Alignment);
      editor.tf.focus();
    },
    [tf.textAlign, editor.tf],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger render={<ToolbarButton pressed={open} tooltip="Align" isDropdown />}>
        <IconValue />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-0" align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={handleValueChange}>
          {items.map(({ icon: Icon, value: itemValue }) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className="pl-2 data-[state=checked]:bg-accent *:first:[span]:hidden"
              value={itemValue}
            >
              <Icon />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
