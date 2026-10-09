import type { TCaptionProps, TImageElement, TResizableProps } from "platejs";
import { NodeApi } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import type * as React from "react";
import * as v from "valibot";

import { cn } from "@/lib/utils";

// CSS custom properties are missing from React's CSSProperties; these aliases name the vars used.
type FigureStyle = React.CSSProperties & { "--media-width"?: string };

type AlignStyle = React.CSSProperties & { "--media-align": string };

export const ImageElementStatic = (
  props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>,
) => {
  const { align = "center", caption, url, width } = props.element;
  const mediaWidth = v.is(v.number(), width) ? `${width}px` : width;
  const figureStyle: FigureStyle = { "--media-width": mediaWidth };
  const alignStyle: AlignStyle = { "--media-align": align };

  return (
    <SlateElement {...props} className="py-2.5">
      <figure
        className="group relative m-0 inline-block w-[var(--media-width)]"
        style={figureStyle}
      >
        <div
          className="relative max-w-full min-w-[92px] [text-align:var(--media-align)]"
          style={alignStyle}
        >
          <img
            className={cn("w-full max-w-full cursor-default object-cover px-0", "rounded-sm")}
            // SAFETY: the image schema stores alt as a string when set, absent otherwise
            alt={props.attributes.alt as string | undefined}
            src={url}
          />
          {caption && (
            <figcaption className="mx-auto mt-2 h-[24px] max-w-full">
              {NodeApi.string(caption[0])}
            </figcaption>
          )}
        </div>
      </figure>
      {props.children}
    </SlateElement>
  );
};
