import { createServerFn } from "@tanstack/react-start";
import { createCompositeComponent } from "@tanstack/react-start/rsc";
import { createSlateEditor } from "platejs";
import type { Value } from "platejs";
import { z } from "zod";

import { BaseEditorKit } from "@/components/editor/editor-base-kit";
import { EditorStatic } from "@/components/ui/editor-static";
import { transformPlateForPreview } from "@/lib/editor/transform-plate-for-preview";
import type {
  FieldSegment,
  PreviewSegment,
  PreviewStepResult,
} from "@/lib/editor/transform-plate-for-preview";
import type { PlateFormField } from "@/lib/editor/transform-plate-to-form";
import { getPublishedFormById } from "@/lib/server-fn/public-form-view";
import type {
  ButtonGroupSlotProps,
  FieldSlotProps,
} from "@/lib/server-fn/public-form-view-rsc.types";

// Hook-free (unlike StaticContentBlock) so it's usable inside an RSC render.
const ServerPlateBlock = ({ nodes }: { nodes: Value }) => {
  const editor = createSlateEditor({ plugins: BaseEditorKit, value: nodes });
  return (
    <EditorStatic
      editor={editor}
      variant="none"
      className="!mx-0 !my-0 !p-0 text-base [&_.slate-p]:m-0 [&_.slate-p]:px-0 [&_.slate-p]:py-1"
    />
  );
};

// Buttons grouped at end of each step (Previous + Next/Submit on same row).
type ButtonField = {
  id: string;
  name: string;
  fieldType: "Button";
  buttonText?: string;
  buttonRole: "next" | "previous" | "submit";
};

type GroupedSegment = PreviewSegment | { type: "buttonGroup"; buttons: ButtonField[] };

const groupSegmentsForRendering = (segments: PreviewSegment[]): GroupedSegment[] => {
  const result: GroupedSegment[] = [];
  const allButtons: ButtonField[] = [];

  for (const seg of segments) {
    if (seg.type === "field" && seg.field.fieldType === "Button") {
      allButtons.push(seg.field as ButtonField);
    } else {
      result.push(seg);
    }
  }

  if (allButtons.length > 1) {
    result.push({ type: "buttonGroup", buttons: allButtons });
  } else if (allButtons.length === 1) {
    result.push({ type: "field", field: allButtons[0] } as FieldSegment);
  }

  return result;
};

const renderStepComponent = async (segments: PreviewSegment[]) => {
  const grouped = groupSegmentsForRendering(segments);
  const fields: PlateFormField[] = [];
  for (const seg of segments) {
    if (seg.type === "field" && seg.field.fieldType !== "Button") {
      fields.push(seg.field);
    }
  }

  // Assign stable, content-derived keys once so the JSX map below doesn't
  // rely on array indices (triggers react/no-array-index-key).
  const keyedItems = grouped.map((item) => {
    if (item.type === "static") {
      const firstNodeId = (item.nodes[0] as { id?: string } | undefined)?.id;
      return {
        ...item,
        key: firstNodeId
          ? `static-${firstNodeId}`
          : `static-${item.nodes.length}-${JSON.stringify(item.nodes[0]).slice(0, 24)}`,
      };
    }
    if (item.type === "buttonGroup") {
      return { ...item, key: `buttons-${item.buttons.map((b) => b.id).join("-")}` };
    }
    return { ...item, key: item.field.id };
  });

  const src = await createCompositeComponent(
    ({
      Field,
      ButtonGroup,
    }: {
      Field: React.ComponentType<FieldSlotProps>;
      ButtonGroup: React.ComponentType<ButtonGroupSlotProps>;
    }) => (
      <>
        {keyedItems.map((item) => {
          if (item.type === "static") {
            return <ServerPlateBlock key={item.key} nodes={item.nodes} />;
          }
          if (item.type === "buttonGroup") {
            return <ButtonGroup key={item.key} groupId={item.key} buttons={item.buttons} />;
          }
          if (item.type === "field") {
            return <Field key={item.key} fieldId={item.field.id} field={item.field} />;
          }
          return null;
        })}
      </>
    ),
  );

  return { src, fields };
};

const renderThankYouComponent = async (nodes: Value | null) => {
  if (!nodes || nodes.length === 0) return null;
  return await createCompositeComponent(() => <ServerPlateBlock nodes={nodes} />);
};

// Returns getPublishedFormById's payload + per-step RSCs + thank-you RSC, so
// the client page never ships Plate rendering code.
export const getPublicFormViewRSC = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Server-to-server in-process call — no HTTP round-trip.
    const base = await getPublishedFormById({ data: { id: data.id } });

    const { steps, thankYouNodes }: PreviewStepResult = base.form
      ? transformPlateForPreview(base.form.content as Value)
      : { steps: [], thankYouNodes: null };

    const [stepComponents, thankYou] = await Promise.all([
      Promise.all(steps.map((segs) => renderStepComponent(segs))),
      renderThankYouComponent(thankYouNodes),
    ]);

    return {
      ...base,
      steps: stepComponents,
      stepCount: steps.length,
      thankYou,
    };
  });
