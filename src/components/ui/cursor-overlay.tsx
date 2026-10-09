import { useCursorOverlay } from "@platejs/selection/react";
import type { CursorData, CursorOverlayState } from "@platejs/selection/react";
import { RangeApi } from "platejs";

import { cn } from "@/lib/utils";

export const CursorOverlay = () => {
  const { cursors } = useCursorOverlay();

  return (
    <>
      {cursors.map((cursor) => (
        <Cursor key={cursor.id} {...cursor} />
      ))}
    </>
  );
};

const Cursor = ({
  id,
  caretPosition,
  data,
  selection,
  selectionRects,
}: CursorOverlayState<CursorData>) => {
  const style = data?.style;
  const selectionStyle = data?.selectionStyle ?? style;
  const isCursor = RangeApi.isCollapsed(selection);

  return (
    <>
      {selectionRects.map((position) => (
        <div
          key={`${position.left}-${position.top}-${position.width}-${position.height}`}
          className={cn(
            "pointer-events-none absolute z-10",
            // oxlint-disable-next-line shadcn/no-raw-colors -- no brand token; needs design decision
            id === "selection" && "bg-brand/25",
            id === "selection" && isCursor && "bg-primary",
          )}
          // oxlint-disable-next-line shadcn/no-inline-styles -- Plate CursorData style spread; user-supplied CSS must keep inline precedence
          style={{
            // oxlint-disable-next-line shadcn/no-inline-styles -- Plate CursorData style spread; user-supplied CSS must keep inline precedence
            ...selectionStyle,
            // oxlint-disable-next-line shadcn/no-inline-styles -- Plate CursorData style spread; user-supplied CSS must keep inline precedence
            ...position,
          }}
        />
      ))}
      {caretPosition && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 w-0.5",
            // oxlint-disable-next-line shadcn/no-raw-colors -- no brand token; needs design decision
            id === "drag" && "bg-brand w-px",
          )}
          // oxlint-disable-next-line shadcn/no-inline-styles -- Plate CursorData style spread; user-supplied CSS must keep inline precedence
          style={{ ...caretPosition, ...style }}
        />
      )}
    </>
  );
};
