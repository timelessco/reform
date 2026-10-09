import type { PlateLeafProps } from "platejs/react";
import { PlateLeaf } from "platejs/react";

export const HighlightLeaf = (props: PlateLeafProps) => (
  // oxlint-disable-next-line shadcn/no-raw-colors -- no highlight token; needs design decision
  <PlateLeaf {...props} as="mark" className="bg-highlight/30 text-inherit">
    {props.children}
  </PlateLeaf>
);
