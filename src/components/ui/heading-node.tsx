import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

import { RequiredBadgeWrapper } from "@/components/ui/required-badge-wrapper";

const headingVariants = cva("relative", {
  variants: {
    variant: {
      h1: "font-bold font-heading text-4xl",
      h2: "font-heading font-semibold text-2xl",
      h3: "font-heading font-semibold text-xl",
      h4: "font-heading font-semibold text-lg",
      h5: "font-semibold text-lg",
      h6: "font-semibold text-base",
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
