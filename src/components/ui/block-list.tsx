import { isOrderedList } from "@platejs/list";
import { useTodoListElement, useTodoListElementState } from "@platejs/list/react";
import type { TElement, TListElement } from "platejs";
import { useReadOnly } from "platejs/react";
import type { PlateElementProps, RenderNodeWrapper } from "platejs/react";
import type React from "react";
import * as v from "valibot";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const TodoMarker = (props: PlateElementProps) => {
  const state = useTodoListElementState({ element: props.element });
  const { checkboxProps } = useTodoListElement(state);
  const readOnly = useReadOnly();

  return (
    <div contentEditable={false}>
      <Checkbox
        className={cn(
          "absolute top-1/2 -left-6 -translate-y-1/2",
          readOnly && "pointer-events-none",
        )}
        {...checkboxProps}
      />
    </div>
  );
};

const TodoLi = (props: PlateElementProps) => (
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
    Li: TodoLi,
    Marker: TodoMarker,
  },
} satisfies Record<
  string,
  {
    Li: React.FC<PlateElementProps>;
    Marker: React.FC<PlateElementProps>;
  }
>;

type ListVariantKey = keyof typeof LIST_VARIANTS;

const isListVariantKey = (value: string): value is ListVariantKey => value in LIST_VARIANTS;

// The list props ride on the element; listStyleType is the discriminating field
// and the wrapper only renders List for a non-empty one.
const isListElement = (element: TElement): element is TListElement =>
  v.is(v.string(), element.listStyleType) && element.listStyleType.length > 0;

export const BlockList: RenderNodeWrapper = (props) => {
  if (!isListElement(props.element)) return;

  return (innerProps) => <List {...innerProps} />;
};

// CSS custom properties are missing from React's CSSProperties; this alias names the one var used.
type ListStyleProperties = React.CSSProperties & { "--list-style-type": string };

const List = (props: PlateElementProps) => {
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
