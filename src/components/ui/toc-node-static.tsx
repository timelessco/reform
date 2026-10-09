import { BaseTocPlugin, isHeading } from "@platejs/toc";
import type { Heading } from "@platejs/toc";
import { cva } from "class-variance-authority";
import { NodeApi } from "platejs";
import type { SlateEditor, TElement } from "platejs";
import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import * as v from "valibot";

import { Button } from "@/components/ui/button";

const headingItemVariants = cva(
  "block h-auto w-full cursor-pointer truncate rounded-none px-0.5 py-1.5 text-left text-muted-foreground underline decoration-[0.5px] underline-offset-4 hover:bg-accent hover:text-muted-foreground",
  {
    variants: {
      depth: {
        1: "pl-0.5",
        2: "pl-[26px]",
        3: "pl-[50px]",
      },
    },
  },
);

export const TocElementStatic = (props: SlateElementProps) => {
  const { editor } = props;
  const headingList = getHeadingList(editor);

  return (
    <SlateElement {...props} className="mb-1 p-0">
      <div>
        {headingList.length > 0 ? (
          headingList.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className={headingItemVariants({
                // SAFETY: this editor only creates h1 through h3, so TOC depths stay 1 to 3
                depth: item.depth as 1 | 2 | 3,
              })}
            >
              {item.title}
            </Button>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">
            Create a heading to display the table of contents.
          </div>
        )}
      </div>
      {props.children}
    </SlateElement>
  );
};

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const headingTagSchema = v.picklist(["h1", "h2", "h3", "h4", "h5", "h6"]);

const headingDepth: Record<HeadingTag, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

const getHeadingList = (editor?: SlateEditor) => {
  if (!editor) return [];

  const options = editor.getOptions(BaseTocPlugin);

  if (options.queryHeading) {
    return options.queryHeading(editor);
  }

  const headingList: Heading[] = [];

  const values = editor.api.nodes<TElement>({
    at: [],
    match: (n) => isHeading(n),
  });

  if (!values) return [];

  Array.from(values).forEach(([node, path]) => {
    const { type } = node;
    const title = NodeApi.string(node);
    const depth = v.is(headingTagSchema, type) ? headingDepth[type] : undefined;
    const id = v.is(v.string(), node.id) ? node.id : undefined;

    if (title && depth !== undefined && id !== undefined) {
      headingList.push({ id, depth, path, title, type });
    }
  });

  return headingList;
};
