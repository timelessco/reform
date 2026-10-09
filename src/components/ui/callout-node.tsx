import { useCalloutEmojiPicker } from "@platejs/callout/react";
import { useEmojiDropdownMenuState } from "@platejs/emoji/react";
import { PlateElement } from "platejs/react";
import type * as React from "react";
import * as v from "valibot";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EmojiPicker, EmojiPopover } from "./emoji-toolbar-button";

export const CalloutElement = ({
  attributes,
  children,
  className,
  ...props
}: React.ComponentProps<typeof PlateElement>) => {
  const { emojiPickerState, isOpen, setIsOpen } = useEmojiDropdownMenuState({
    closeOnSelect: true,
  });

  const { emojiToolbarDropdownProps, props: calloutProps } = useCalloutEmojiPicker({
    isOpen,
    setIsOpen,
  });

  const backgroundColor = v.is(v.string(), props.element.backgroundColor)
    ? props.element.backgroundColor
    : undefined;

  const icon =
    v.is(v.string(), props.element.icon) && props.element.icon ? props.element.icon : "💡";

  return (
    <PlateElement
      className={cn(
        "my-1 flex rounded-sm p-4 pl-3",
        backgroundColor ? "[background-color:var(--callout-background)]" : "bg-muted",
        className,
      )}
      // SAFETY: React's closed CSSProperties type omits custom properties; the runtime accepts any "--" prefixed declaration
      style={
        backgroundColor
          ? ({ "--callout-background": backgroundColor } as React.CSSProperties)
          : undefined
      }
      attributes={{
        ...attributes,
        "data-plate-open-context-menu": true,
      }}
      {...props}
    >
      <div className="flex w-full gap-2 rounded-md">
        <EmojiPopover
          {...emojiToolbarDropdownProps}
          control={
            <Button
              variant="ghost"
              className="size-6 p-1 [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji',NotoColorEmoji,'Noto_Color_Emoji','Segoe_UI_Symbol','Android_Emoji',EmojiSymbols] text-[18px] select-none hover:bg-muted-foreground/15"
              contentEditable={false}
            >
              {icon}
            </Button>
          }
        >
          <EmojiPicker {...emojiPickerState} {...calloutProps} />
        </EmojiPopover>
        <div className="w-full">{children}</div>
      </div>
    </PlateElement>
  );
};
