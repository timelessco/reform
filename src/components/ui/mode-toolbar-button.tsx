import { SuggestionPlugin } from "@platejs/suggestion/react";
import { EyeIcon, PencilLineIcon, PenIcon } from "@/components/ui/icons";
import { useEditorRef, usePlateState, usePluginOption } from "platejs/react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ToolbarButton } from "./toolbar";

export const ModeToolbarButton = (props: React.ComponentProps<typeof DropdownMenu>) => {
  const editor = useEditorRef();
  const [readOnly, setReadOnly] = usePlateState("readOnly");
  const [open, setOpen] = React.useState(false);

  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");

  let value = "editing";

  if (readOnly) value = "viewing";

  if (isSuggesting) value = "suggestion";

  const item: Record<string, { icon: React.ReactNode; label: string }> = {
    editing: {
      icon: <PenIcon />,
      label: "Editing",
    },
    suggestion: {
      icon: <PencilLineIcon />,
      label: "Suggestion",
    },
    viewing: {
      icon: <EyeIcon />,
      label: "Viewing",
    },
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger
        render={<ToolbarButton pressed={open} tooltip="Editing mode" isDropdown />}
      >
        {item[value].icon}
        <span className="hidden lg:inline">{item[value].label}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[180px]" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            if (newValue === "viewing") {
              setReadOnly(true);

              return;
            }
            setReadOnly(false);

            if (newValue === "suggestion") {
              editor.setOption(SuggestionPlugin, "isSuggesting", true);

              return;
            }
            editor.setOption(SuggestionPlugin, "isSuggesting", false);

            if (newValue === "editing") {
              editor.tf.focus();

              return;
            }
          }}
        >
          <DropdownMenuRadioItem className="pl-2 *:[svg]:text-muted-foreground" value="editing">
            {item.editing.icon}
            {item.editing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem className="pl-2 *:[svg]:text-muted-foreground" value="viewing">
            {item.viewing.icon}
            {item.viewing.label}
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem className="pl-2 *:[svg]:text-muted-foreground" value="suggestion">
            {item.suggestion.icon}
            {item.suggestion.label}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
