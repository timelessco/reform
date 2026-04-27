import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";

export const DateElementStatic = (props: SlateElementProps) => {
  const { element } = props;

  return (
    <SlateElement className="inline-block" {...props}>
      <span className="w-fit rounded-sm bg-muted px-1 text-muted-foreground">
        {element.date ? (
          (() => {
            const today = new Date();
            const dateValue = element.date as string | undefined;
            if (!dateValue) return "No date";
            const elementDate = new Date(dateValue);
            const isToday =
              elementDate.getDate() === today.getDate() &&
              elementDate.getMonth() === today.getMonth() &&
              elementDate.getFullYear() === today.getFullYear();

            const isYesterday =
              new Date(today.setDate(today.getDate() - 1)).toDateString() ===
              elementDate.toDateString();
            const isTomorrow =
              new Date(today.setDate(today.getDate() + 2)).toDateString() ===
              elementDate.toDateString();

            if (isToday) return "Today";
            if (isYesterday) return "Yesterday";
            if (isTomorrow) return "Tomorrow";

            return elementDate.toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          })()
        ) : (
          <span>Pick a date</span>
        )}
      </span>
      {props.children}
    </SlateElement>
  );
};
