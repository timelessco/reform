import type { TElement, Value } from "platejs";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import { createFormHeaderNode } from "@/components/ui/form-header-node";

/**
 * Ensure saved editor content has a formHeader at index 0 and a submit button.
 * Shared between the authenticated editor and the landing (local) editor.
 */
export const migrateEditorContent = (
  content: Value,
  metadata?: { title?: string | null; icon?: string | null; cover?: string | null },
): Value => {
  let result = content;

  // Ensure formHeader exists at index 0
  if (result.length === 0 || result[0]?.type !== "formHeader") {
    result = [
      createFormHeaderNode({
        title: metadata?.title || "",
        icon: metadata?.icon || null,
        cover: metadata?.cover || null,
      }) as unknown as TElement,
      ...result,
    ];
  }

  // Ensure Submit button exists
  const hasSubmitButton = result.some(
    (node: TElement) => node.type === "formButton" && node.buttonRole === "submit",
  );
  if (!hasSubmitButton) {
    const thankYouIndex = result.findIndex(
      (node: TElement) => node.type === "pageBreak" && node.isThankYouPage === true,
    );
    const insertIndex = thankYouIndex !== -1 ? thankYouIndex : result.length;
    result = [
      ...result.slice(0, insertIndex),
      createFormButtonNode("submit") as unknown as TElement,
      ...result.slice(insertIndex),
    ];
  }

  return result;
};
