import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import type * as React from "react";
import * as v from "valibot";

import { cn } from "@/lib/utils";

export const CalloutElementStatic = ({ children, className, ...props }: SlateElementProps) => {
  const backgroundColor = v.is(v.string(), props.element.backgroundColor)
    ? props.element.backgroundColor
    : undefined;

  const icon =
    v.is(v.string(), props.element.icon) && props.element.icon ? props.element.icon : "💡";

  return (
    <SlateElement
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
      {...props}
    >
      <div className="flex w-full gap-2 rounded-md">
        <div className="size-6 [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji',NotoColorEmoji,'Noto_Color_Emoji','Segoe_UI_Symbol','Android_Emoji',EmojiSymbols] text-[18px] select-none">
          <span data-plate-prevent-deserialization>{icon}</span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </SlateElement>
  );
};
