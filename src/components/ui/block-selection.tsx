import { useBlockSelected } from "@platejs/selection/react";
import { cva } from "class-variance-authority";
import type { PlateElementProps } from "platejs/react";

// Extend the highlight 8px past the block's bottom edge so multi-block
// selections appear continuous instead of striped — the inter-block margin
// gap between adjacent blocks is what was causing the "gappy" look. Biasing
// only to the bottom (vs. both top and bottom) keeps adjacent highlights
// from doubling up at the seam, which would otherwise read as a darker band
// since bg-primary/[.13] is translucent. Rounded corners match the rest of
// the site's --radius-lg convention used on inputs/cards.
export const blockSelectionVariants = cva(
  "pointer-events-none absolute inset-x-0 top-0 -bottom-2 z-1 bg-primary/[.13] rounded-[var(--radius-lg)] transition-opacity",
  {
    defaultVariants: {
      active: true,
    },
    variants: {
      active: {
        false: "opacity-0",
        true: "opacity-100",
      },
    },
  },
);

export const BlockSelection = (props: PlateElementProps) => {
  const isBlockSelected = useBlockSelected();

  if (!isBlockSelected || props.plugin.key === "tr" || props.plugin.key === "table") return null;

  return (
    <div
      className={blockSelectionVariants({
        active: isBlockSelected,
      })}
      data-slot="block-selection"
    />
  );
};
