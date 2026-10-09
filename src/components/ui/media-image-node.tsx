import { useDraggable } from "@platejs/dnd";
import { Image, ImagePlugin, useMediaState } from "@platejs/media/react";
import { ResizableProvider, useResizableValue } from "@platejs/resizable";
import type { TImageElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, withHOC } from "platejs/react";
import type React from "react";
import * as v from "valibot";

import { cn } from "@/lib/utils";

import { Caption, CaptionTextarea } from "./caption";
import { MediaToolbar } from "./media-toolbar";
import { mediaResizeHandleVariants, Resizable, ResizeHandle } from "./resize-handle";

const preventDefaultFocus = (e: React.FocusEvent) => {
  e.preventDefault();
};

export const ImageElement = withHOC(
  ResizableProvider,
  function ImageElement(props: PlateElementProps<TImageElement>) {
    const { align = "center", focused, readOnly, selected } = useMediaState();
    const width = useResizableValue("width");

    const { isDragging, handleRef } = useDraggable({
      element: props.element,
    });

    return (
      <MediaToolbar plugin={ImagePlugin}>
        <PlateElement {...props} className="py-2.5">
          <figure className="group relative m-0" contentEditable={false}>
            <Resizable
              align={align}
              options={{
                align,
                readOnly,
              }}
            >
              <ResizeHandle
                className={mediaResizeHandleVariants({ direction: "left" })}
                options={{ direction: "left" }}
              />
              <Image
                ref={handleRef}
                className={cn(
                  "block w-full max-w-full cursor-pointer object-cover px-0",
                  "rounded-sm",
                  focused && selected && "ring-2 ring-ring ring-offset-2",
                  isDragging && "opacity-50",
                )}
                // SAFETY: the image schema stores alt as a string when set, absent otherwise
                alt={props.attributes.alt as string | undefined}
              />
              <ResizeHandle
                className={mediaResizeHandleVariants({
                  direction: "right",
                })}
                options={{ direction: "right" }}
              />
            </Resizable>

            <Caption
              className="w-[var(--caption-width)]"
              align={align}
              // SAFETY: React's closed CSSProperties type omits custom properties; the runtime accepts any "--" prefixed declaration
              style={
                {
                  "--caption-width": v.is(v.number(), width) ? `${width}px` : width,
                } as React.CSSProperties
              }
            >
              <CaptionTextarea
                readOnly={readOnly}
                onFocus={preventDefaultFocus}
                placeholder="Write a caption..."
              />
            </Caption>
          </figure>

          {props.children}
        </PlateElement>
      </MediaToolbar>
    );
  },
);
