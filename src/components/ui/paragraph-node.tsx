import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

import { RequiredBadgeWrapper } from "@/components/ui/required-badge-wrapper";
import { cn } from "@/lib/utils";

export const ParagraphElement = (props: PlateElementProps) => (
  <RequiredBadgeWrapper path={props.path}>
    <PlateElement {...props} className={cn("m-0 px-0 py-1")}>
      {props.children}
    </PlateElement>
  </RequiredBadgeWrapper>
);
