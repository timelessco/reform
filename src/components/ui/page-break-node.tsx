import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef, useFocused, useReadOnly, useSelected } from "platejs/react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface PageBreakElementData {
  type: "pageBreak";
  id?: string;
  isThankYouPage: boolean;
  children: [{ text: "" }];
}

export const createPageBreakNode = (
  data: Partial<Omit<PageBreakElementData, "type" | "children">> = {},
): PageBreakElementData => ({
  type: "pageBreak",
  isThankYouPage: data.isThankYouPage ?? false,
  children: [{ text: "" }],
});

export const PageBreakElement = (props: PlateElementProps) => {
  const { element, children } = props;
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const selected = useSelected();
  const focused = useFocused();

  const isThankYouPage = (element.isThankYouPage as boolean) ?? false;

  // Calculate page number by counting pageBreak elements before this one
  const pageNumber = (() => {
    const path = editor.api.findPath(element);
    if (!path) return 2;

    let count = 2; // Page 1 is before first pageBreak, so this starts at 2
    for (const [, nodePath] of editor.api.nodes({
      at: [],
      match: { type: "pageBreak" },
    })) {
      // Count pageBreaks that come before current element
      if (nodePath[0] < path[0]) {
        count++;
      }
    }
    return count;
  })();
  const handleThankYouToggle = (checked: boolean) => {
    const path = editor.api.findPath(element);
    if (!path) return;

    // Wrap all operations to prevent normalization between steps
    editor.tf.withoutNormalizing(() => {
      if (checked) {
        // Remove isThankYouPage from all other pageBreak elements
        for (const [, nodePath] of editor.api.nodes({
          match: { type: "pageBreak" },
        })) {
          if (nodePath[0] !== path[0]) {
            editor.tf.setNodes({ isThankYouPage: false }, { at: nodePath });
          }
        }

        // FIRST set isThankYouPage so normalization knows this is a thank you section
        editor.tf.setNodes({ isThankYouPage: true }, { at: path });

        // THEN remove buttons from the section after this pageBreak
        // Find the range: from this pageBreak+1 to next pageBreak or end
        const startIdx = path[0] + 1;
        let endIdx = editor.children.length;
        for (let i = startIdx; i < editor.children.length; i++) {
          const node = editor.children[i] as { type?: string };
          if (node.type === "pageBreak") {
            endIdx = i;
            break;
          }
        }
        // Remove formButtons in range [startIdx, endIdx) in reverse order
        for (let i = endIdx - 1; i >= startIdx; i--) {
          const node = editor.children[i] as { type?: string };
          if (node.type === "formButton") {
            editor.tf.removeNodes({ at: [i] });
          }
        }
      } else {
        // Set the current element's isThankYouPage to false
        editor.tf.setNodes({ isThankYouPage: false }, { at: path });
      }
    });
  };

  return (
    <PlateElement {...props} className={cn("clear-both", props.className)}>
      <div
        contentEditable={false}
        role="presentation"
        className={cn(
          "relative my-6 flex items-center justify-center select-none",
          selected && focused && "ring-2 ring-ring ring-offset-2 rounded",
        )}
      >
        {/* Left dashed line */}
        <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />

        {/* Page label */}
        <div className="mx-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>Page {pageNumber}</span>

          {/* Thank you page toggle */}
          {!((element.hasFormFields as boolean) ?? false) && (
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`thank-you-toggle-${element.id || pageNumber}`}
                className="text-xs text-muted-foreground cursor-pointer"
              >
                'Thank you' page
              </Label>
              <Switch
                id={`thank-you-toggle-${element.id || pageNumber}`}
                aria-label="Thank you page"
                checked={isThankYouPage}
                onCheckedChange={handleThankYouToggle}
                disabled={readOnly}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* Right dashed line */}
        <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
      </div>
      {children}
    </PlateElement>
  );
};
