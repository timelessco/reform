import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import type * as React from "react";

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

export const HeadingElementStatic = ({
  variant = "h1",
  ...props
}: SlateElementProps & VariantProps<typeof headingVariants>) => (
  <SlateElement as={variant ?? "h1"} className={headingVariants({ variant })} {...props}>
    {props.children}
  </SlateElement>
);

export const H1ElementStatic = (props: SlateElementProps) => (
  <HeadingElementStatic variant="h1" {...props} />
);

export const H2ElementStatic = (props: React.ComponentProps<typeof HeadingElementStatic>) => (
  <HeadingElementStatic variant="h2" {...props} />
);

export const H3ElementStatic = (props: React.ComponentProps<typeof HeadingElementStatic>) => (
  <HeadingElementStatic variant="h3" {...props} />
);

export const H4ElementStatic = (props: React.ComponentProps<typeof HeadingElementStatic>) => (
  <HeadingElementStatic variant="h4" {...props} />
);

export const H5ElementStatic = (props: React.ComponentProps<typeof HeadingElementStatic>) => (
  <HeadingElementStatic variant="h5" {...props} />
);

export const H6ElementStatic = (props: React.ComponentProps<typeof HeadingElementStatic>) => (
  <HeadingElementStatic variant="h6" {...props} />
);
