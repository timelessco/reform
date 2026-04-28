import type { PlateElementProps } from "platejs/react";
import { PlateElement, useSelected } from "platejs/react";

import { cn } from "@/lib/utils";

export const ParagraphElement = (props: PlateElementProps) => {
  const { editor, element, attributes } = props;
  // Cursor-landing paragraphs (empty + not currently the user's focus or
  // block-selection target) collapse to no padding via the CSS rule on
  // [data-bf-quiet], so they don't take ~44px of visual real estate
  // between form sections. The moment the user clicks into one or it
  // becomes part of a block selection, the attribute drops and the block
  // re-inflates to its padded size — visual jump aligns with interaction.
  const selected = useSelected();
  const isEmpty = editor.api.isEmpty(element);
  const quiet = isEmpty && !selected;

  return (
    <PlateElement
      {...props}
      attributes={{ ...attributes, ...(quiet ? { "data-bf-quiet": "true" } : {}) }}
      className={cn("m-0 px-0")}
    >
      {props.children}
    </PlateElement>
  );
};
