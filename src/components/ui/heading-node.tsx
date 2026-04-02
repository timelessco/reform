import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

import { RequiredBadgeWrapper } from "@/components/ui/required-badge-wrapper";

const headingVariants = cva("relative mb-1", {
  variants: {
    variant: {
      h1: "mt-[0.40em] pb-1 font-bold font-heading text-4xl",
      h2: "mt-[0.40em] pb-px font-heading font-semibold text-2xl",
      h3: "mt-[0.30em] pb-px font-heading font-semibold text-xl",
      h4: "mt-[0.25em] font-heading font-semibold text-lg",
      h5: "mt-[0.25em] font-semibold text-lg",
      h6: "mt-[0.25em] font-semibold text-base",
    },
  },
});

export const HeadingElement = ({
  variant = "h1",
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) => (
  <RequiredBadgeWrapper path={props.path}>
    <PlateElement as={variant ?? "h1"} className={headingVariants({ variant })} {...props}>
      {props.children}
    </PlateElement>
  </RequiredBadgeWrapper>
);

export const H1Element = (props: PlateElementProps) => <HeadingElement variant="h1" {...props} />;

export const H2Element = (props: PlateElementProps) => <HeadingElement variant="h2" {...props} />;

export const H3Element = (props: PlateElementProps) => <HeadingElement variant="h3" {...props} />;

export const H4Element = (props: PlateElementProps) => <HeadingElement variant="h4" {...props} />;

export const H5Element = (props: PlateElementProps) => <HeadingElement variant="h5" {...props} />;

export const H6Element = (props: PlateElementProps) => <HeadingElement variant="h6" {...props} />;
