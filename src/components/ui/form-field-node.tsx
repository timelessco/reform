import type { ComponentType, ReactNode } from "react";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import {
  AtSignIcon,
  CalendarIcon,
  ClockIcon,
  HashIcon,
  LinkIcon,
  PhoneIcon,
  TextIcon,
} from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFormInputNode } from "@/hooks/use-form-input-node";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

type FormFieldVariant = {
  /** Tooltip label shown to the editor on the trailing icon. */
  label: string;
  /** Trailing icon component. */
  icon: IconComponent;
  /** Default placeholder when the node doesn't carry one explicitly. */
  defaultPlaceholder?: string;
  /**
   * Escape hatch for variants that need a non-trivial editor preview later
   * (e.g. an inline date-picker stub). Returning a ReactNode replaces the
   * default shell entirely. None of the current variants use it — kept here
   * so adding one in the future doesn't require splitting the file back up.
   */
  customRender?: (props: PlateElementProps) => ReactNode;
};

const VARIANTS: Record<string, FormFieldVariant> = {
  formInput: { label: "Short answer", icon: TextIcon },
  formEmail: { label: "Email", icon: AtSignIcon },
  formPhone: { label: "Phone", icon: PhoneIcon },
  formNumber: { label: "Number", icon: HashIcon },
  formLink: { label: "Link", icon: LinkIcon },
  formDate: { label: "Date", icon: CalendarIcon, defaultPlaceholder: "Select a date" },
  formTime: { label: "Time", icon: ClockIcon, defaultPlaceholder: "Select a time" },
};

export const FormFieldElement = (allProps: PlateElementProps) => {
  const { className, children, ...props } = allProps;
  const { attributes, element, ...rest } = props;
  // Hook is unconditional (rules-of-hooks); variant gating happens after.
  const { focused, isSelected } = useFormInputNode(element);
  const variant = VARIANTS[element.type];
  if (!variant) return null;
  if (variant.customRender) return variant.customRender(allProps);

  const placeholder = (element.placeholder as string | undefined) ?? variant.defaultPlaceholder;
  const Icon = variant.icon;

  return (
    <PlateElement
      attributes={{ ...attributes, placeholder, "data-bf-input": "true" }}
      className={cn(
        "relative flex h-7 w-full max-w-[464px] items-center rounded-[var(--radius-lg)] border-0 bg-card pl-[10px] pr-[8px] text-sm shadow-[0_0_1px_rgba(0,0,0,0.54),0_1px_1px_rgba(0,0,0,0.06)] cursor-text caret-current",
        isSelected && focused && "ring-ring/50 ring-[3px]",
        className,
      )}
      element={element}
      {...rest}
    >
      <span className="flex-1 min-w-0 outline-none text-muted-foreground/50 line-clamp-1 break-all">
        {children}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className="shrink-0 flex items-center justify-center text-muted-foreground select-none ml-1"
              contentEditable={false}
            />
          }
        >
          <Icon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="left">{variant.label}</TooltipContent>
      </Tooltip>
    </PlateElement>
  );
};
