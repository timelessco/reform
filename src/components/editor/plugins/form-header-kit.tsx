import { type Path, PathApi, type TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { FormHeaderElement } from "@/components/ui/form-header-node";

export const FormHeaderPlugin = createPlatePlugin({
  key: "formHeader",
  node: {
    isElement: true,
    isVoid: true,
    isSelectable: false,
    component: FormHeaderElement,
  },
  extendEditor: ({ editor }: any) => {
    const editorRef = editor as any;
    const { normalizeNode, deleteBackward, deleteForward, deleteFragment } = editorRef;

    editorRef.normalizeNode = (entry: any) => {
      const path = entry[1];

      // Root normalization
      if (path.length === 0) {
        const children = editorRef.children as TElement[];

        // Ensure first child is formHeader
        if (children.length > 0 && children[0].type !== "formHeader") {
          const headerIndex = children.findIndex((n) => n.type === "formHeader");

          if (headerIndex !== -1) {
            // Move existing header to top
            editorRef.tf.moveNodes({
              at: [headerIndex],
              to: [0],
            });
            return;
          }
        }

        // Ensure at least one paragraph after header
        if (children.length === 1 && children[0].type === "formHeader") {
          editorRef.tf.insertNodes({ type: "p", children: [{ text: "" }] } as TElement, {
            at: [1],
          });
          return;
        }
      }

      normalizeNode(entry);
    };

    editorRef.deleteBackward = (unit: any) => {
      const block = editorRef.api.block();
      const [node, path] = (block as [TElement, Path]) ?? [];

      if (node?.type === "formHeader") {
        return;
      }

      // Prevent deleting backwards INTO the header
      if (path && path[0] === 1) {
        const selection = editorRef.selection;
        if (selection && editorRef.api.isCollapsed(selection)) {
          const edges = editorRef.api.edges(path) as any;
          const start = edges?.[0];
          if (
            start &&
            PathApi.equals(selection.anchor.path, start.path) &&
            selection.anchor.offset === start.offset
          ) {
            return;
          }
        }
      }

      deleteBackward(unit);
    };

    editorRef.deleteForward = (unit: any) => {
      const block = editorRef.api.block();
      const [node] = (block as [TElement, Path]) ?? [];

      if (node?.type === "formHeader") {
        return;
      }

      deleteForward(unit);
    };

    editorRef.deleteFragment = (direction: any) => {
      const { selection } = editorRef;
      if (!selection) {
        deleteFragment(direction);
        return;
      }

      const edges = (editorRef.api.edges(selection) as any) ?? [];
      const start = edges[0];
      const end = edges[1];

      if (start?.path?.[0] === 0) {
        if (editorRef.children.length > 1) {
          editorRef.tf.delete({
            at: {
              anchor: (editorRef.api.edges([1]) as any)[0],
              focus: end,
            },
          });

          if (editorRef.children.length === 1) {
            editorRef.tf.insertNodes({ type: "p", children: [{ text: "" }] } as TElement, {
              at: [1],
            });
            editorRef.tf.select((editorRef.api.edges([1]) as any)[0]);
          }
          return;
        }
        return;
      }

      deleteFragment(direction);
    };

    return editorRef;
  },
});

export const FormHeaderKit = [FormHeaderPlugin];
