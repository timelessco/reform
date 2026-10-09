// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { DndPlugin } from "@platejs/dnd";
import { createPlateEditor, createPlatePlugin, Plate, PlateContent } from "platejs/react";
import { Profiler } from "react";
import type { PlateElementProps } from "platejs/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageBreakElement } from "@/components/ui/page-break-node";
import { FormOptionItemElement } from "@/components/ui/form-option-item-node";
import { createLogicBlockNode, LogicBlockElement } from "@/components/ui/logic-block-node";

afterEach(cleanup);

describe("editor node subscriptions", () => {
  it("keeps logic pickers current after field and step edits", async () => {
    let commits = 0;

    const editor = createPlateEditor({
      plugins: [
        createPlatePlugin({
          key: "logicBlock",
          node: {
            isElement: true,
            component: (props: PlateElementProps) => (
              <Profiler
                id="logic"
                onRender={() => {
                  commits++;
                }}
              >
                <LogicBlockElement {...props} />
              </Profiler>
            ),
          },
        }),
      ],
      value: [
        { type: "p", children: [{ text: "Body" }] },
        { type: "formLabel", id: "label-email", children: [{ text: "Email" }] },
        { type: "formEmail", children: [{ text: "" }] },
        { ...createLogicBlockNode() },
      ],
    });

    render(
      <Plate editor={editor}>
        <PlateContent />
      </Plate>,
    );
    await act(async () => {});
    const before = commits;
    await act(async () => {
      editor.tf.insertText("!", { at: { path: [0, 0], offset: 4 } });
    });
    expect(commits).toBe(before);
    await act(async () => {
      editor.tf.insertText(" address", { at: { path: [1, 0], offset: 5 } });
    });
    expect(commits).toBeGreaterThan(before);
    const renamed = commits;
    await act(async () => {
      editor.tf.setNodes({ isFieldArray: true }, { at: [2] });
    });
    expect(commits).toBeGreaterThan(renamed);
    const repeatable = commits;
    await act(async () => {
      editor.tf.insertNodes(
        { type: "pageBreak", id: "next-step", children: [{ text: "" }] },
        { at: [3] },
      );
    });
    expect(commits).toBeGreaterThan(repeatable);
  });

  it("renumbers page breaks after deletion while skipping unrelated typing", async () => {
    let renders = 0;

    const editor = createPlateEditor({
      plugins: [
        createPlatePlugin({
          key: "pageBreak",
          node: {
            isElement: true,
            component: (props: PlateElementProps) => (
              <Profiler
                id="page-break"
                onRender={() => {
                  renders++;
                }}
              >
                <PageBreakElement {...props} />
              </Profiler>
            ),
          },
        }),
      ],
      value: [
        { type: "p", children: [{ text: "Body" }] },
        { type: "pageBreak", id: "page-a", children: [{ text: "" }] },
        { type: "pageBreak", id: "page-b", children: [{ text: "" }] },
      ],
    });

    render(
      <Plate editor={editor}>
        <PlateContent />
      </Plate>,
    );
    await waitFor(() => expect(screen.getByText("Page 3")).toBeTruthy());
    const before = renders;
    await act(async () => {
      editor.tf.insertText("!", { at: { path: [0, 0], offset: 4 } });
    });
    expect(renders).toBe(before);
    await act(async () => {
      editor.tf.removeNodes({ at: [1] });
    });
    await waitFor(() => expect(screen.queryByText("Page 3")).toBeNull());
    expect(screen.getByText("Page 2")).toBeTruthy();
  });

  it("updates option ordinals after reorder and preserves dropdown mode", async () => {
    const editor = createPlateEditor({
      plugins: [
        DndPlugin,
        createPlatePlugin({
          key: "formOptionItem",
          node: { isElement: true, component: FormOptionItemElement },
        }),
      ],
      value: [
        { type: "p", children: [{ text: "Body" }] },
        {
          type: "formOptionItem",
          id: "option-a",
          variant: "multiChoice",
          children: [{ text: "Alpha" }],
        },
        {
          type: "formOptionItem",
          id: "option-b",
          variant: "multiChoice",
          children: [{ text: "Beta" }],
        },
      ],
    });

    const { container } = render(
      <Plate editor={editor}>
        <PlateContent />
      </Plate>,
    );

    const optionText = (label: string) =>
      screen.getByText(label).closest('[data-slate-node="element"]')?.textContent;

    await waitFor(() => expect(screen.getByText("Alpha")).toBeTruthy());
    expect(optionText("Alpha")).toMatch(/^AAlpha/);
    expect(optionText("Beta")).toMatch(/^BBeta/);
    await act(async () => {
      editor.tf.select({ path: [2, 0], offset: 0 });
    });
    expect(screen.getByText("Add option")).toBeTruthy();
    await act(async () => {
      editor.tf.select({ path: [0, 0], offset: 0 });
    });
    expect(screen.queryByText("Add option")).toBeNull();
    await act(async () => {
      editor.tf.moveNodes({ at: [2], to: [1] });
    });
    expect(optionText("Beta")).toMatch(/^ABeta/);
    expect(optionText("Alpha")).toMatch(/^BAlpha/);
    expect(editor.children[1].children).toEqual([{ text: "Beta" }]);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
    await act(async () => {
      editor.tf.setNodes({ showAsDropdown: true }, { at: [1] });
    });
    await waitFor(() => expect(container.querySelector("input")).not.toBeNull());
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.queryByText("B")).toBeNull();
  });
});
