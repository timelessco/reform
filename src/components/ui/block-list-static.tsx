import { isOrderedList } from "@platejs/list";
import type { TElement, TListElement, RenderStaticNodeWrapper } from "platejs";
import type { SlateRenderElementProps } from "platejs/static";
import type * as React from "react";
import * as v from "valibot";

import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const TodoMarkerStatic = (props: SlateRenderElementProps) => {
  const checked = Boolean(props.element.checked);

  return (
    <div contentEditable={false}>
      <Button
        variant="ghost"
        className={cn(
          "peer pointer-events-none absolute top-1/2 -left-6 size-4 shrink-0 -translate-y-1/2 rounded-sm border border-primary bg-background p-0 ring-offset-background hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          props.className,
        )}
        data-state={checked ? "checked" : "unchecked"}
      >
        <div className={cn("flex items-center justify-center text-current")}>
          {checked && <CheckIcon className="size-4" />}
        </div>
      </Button>
    </div>
  );
};

const TodoLiStatic = (props: SlateRenderElementProps) => (
  <li
    className={cn(
      "list-none",
      Boolean(props.element.checked) && "text-muted-foreground line-through",
    )}
  >
    {props.children}
  </li>
);

const LIST_VARIANTS = {
  todo: {
    Li: TodoLiStatic,
    Marker: TodoMarkerStatic,
  },
} satisfies Record<
  string,
  {
    Li: React.FC<SlateRenderElementProps>;
    Marker: React.FC<SlateRenderElementProps>;
  }
>;

type ListVariantKey = keyof typeof LIST_VARIANTS;

const isListVariantKey = (value: string): value is ListVariantKey => value in LIST_VARIANTS;

// The list props ride on the element; listStyleType is the discriminating field
// and the wrapper only renders List for a non-empty one.
const isListElement = (element: TElement): element is TListElement =>
  v.is(v.string(), element.listStyleType) && element.listStyleType.length > 0;

export const BlockListStatic: RenderStaticNodeWrapper = (props) => {
  if (!isListElement(props.element)) return;

  return (innerProps) => <List {...innerProps} />;
};

// CSS custom properties are missing from React's CSSProperties; this alias names the one var used.
type ListStyleProperties = React.CSSProperties & { "--list-style-type": string };

const List = (props: SlateRenderElementProps) => {
  if (!isListElement(props.element)) return null;
  const { listStart, listStyleType } = props.element;
  const { Li, Marker } = isListVariantKey(listStyleType) ? LIST_VARIANTS[listStyleType] : {};
  const ListTag = isOrderedList(props.element) ? "ol" : "ul";
  const listStyle: ListStyleProperties = { "--list-style-type": listStyleType };

  return (
    <ListTag
      className="relative m-0 [list-style-type:var(--list-style-type)] p-0"
      style={listStyle}
      start={listStart}
    >
      {Marker && <Marker {...props} />}
      {Li ? <Li {...props} /> : <li>{props.children}</li>}
    </ListTag>
  );
};
