import type { TElement, Value } from "platejs";

/** Legacy choice shapes → canonical option items. Dropdown / Multi-select stopped being field
 * types (2026-06): dropdown = multiChoice + showAsDropdown, multi-select = checkbox +
 * showAsDropdown. Runs on every read (editor load + both plate transforms) so stored docs and
 * already-published forms migrate lazily — no DB rewrite. */
export const normalizeOptionNodes = (content: Value): Value => {
  let changed = false;
  const result: TElement[] = [];

  // Group flags (showAsDropdown/randomizeOrder/optionLabel) live on the group's first option node.
  const isGroupStart = () => result[result.length - 1]?.type !== "formOptionItem";

  for (const node of content) {
    if (
      node.type === "formOptionItem" &&
      (node.variant === "dropdown" || node.variant === "multiSelect")
    ) {
      changed = true;

      const first = isGroupStart();
      const { shuffle, ...rest } = node;

      const option: TElement = {
        ...rest,
        variant: node.variant === "dropdown" ? "multiChoice" : "checkbox",
      };

      if (first) option.showAsDropdown = true;

      // legacy dropdown kept its own `shuffle` key (old context menu); fold into randomizeOrder
      if (first && shuffle) option.randomizeOrder = true;

      // dropdown rows had no leading marker; pin "none" (the builder reads optionLabel per row)
      // so migrated rows don't sprout letter badges
      if (node.variant === "dropdown" && !node.optionLabel) option.optionLabel = "none";

      result.push(option);
      continue;
    }

    if (node.type === "formMultiSelectInput") {
      changed = true;
      const opts = (Array.isArray(node.options) ? node.options : []).filter((t) => t.trim());
      const texts = opts.length > 0 ? opts : [""];

      const { type: _type, options: _options, children: _children, ...rest } = node;

      texts.forEach((text, idx) => {
        if (idx === 0) {
          // id/required/selection limits carry onto the group's first option node
          result.push({
            ...rest,
            showAsDropdown: true,
            type: "formOptionItem",
            variant: "checkbox",
            children: [{ text }],
          });
        } else {
          result.push({
            type: "formOptionItem",
            variant: "checkbox",
            children: [{ text }],
          });
        }
      });
      continue;
    }

    result.push(node);
  }

  return changed ? result : content;
};
