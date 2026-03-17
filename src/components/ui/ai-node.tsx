import { AIChatPlugin } from "@platejs/ai/react";
import { PlateElement, PlateText, usePluginOption } from "platejs/react";
import type { PlateElementProps, PlateTextProps } from "platejs/react";

import { cn } from "@/lib/utils";

export const AILeaf = (props: PlateTextProps) => {
  const streaming = usePluginOption(AIChatPlugin, "streaming");
  const streamingLeaf = props.editor.getApi(AIChatPlugin).aiChat.node({ streaming: true });

  const isLast = streamingLeaf?.[0] === props.text;

  return (
    <PlateText
      className={cn(
        "border-b-2 border-b-purple-100 bg-purple-50 text-purple-800",
        "transition-[opacity,transform] duration-200 ease-in-out",
        isLast &&
          streaming &&
          'after:ml-1.5 after:inline-block after:h-3 after:w-3 after:rounded-full after:bg-primary after:align-middle after:content-[""]',
      )}
      {...props}
    />
  );
};

export const AIAnchorElement = (props: PlateElementProps) => (
  <PlateElement {...props}>
    <div className="h-[0.1px]" />
  </PlateElement>
);
