import { createServerFn } from "@tanstack/react-start";
import { createCompositeComponent } from "@tanstack/react-start/rsc";
import { createSlateEditor } from "platejs";
import type { Value } from "platejs";
import { z } from "zod";

import { BaseEditorKit } from "@/components/editor/editor-base-kit";
import { EditorStatic } from "@/components/ui/editor-static";
import { cn } from "@/lib/utils";
import { transformPlateForPreview } from "@/lib/editor/transform-plate-for-preview";
import type {
  FieldSegment,
  PreviewSegment,
  PreviewStepResult,
} from "@/lib/editor/transform-plate-for-preview";
import type { PlateFormField } from "@/lib/editor/transform-plate-to-form";
import { applyFormCacheHeaders } from "@/lib/server-fn/cdn-cache";
import { getFieldChunkUrls } from "@/lib/server-fn/field-chunk-manifest";
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

// Server-rendered label + required badge. No hooks, no Tooltip (that's
// client-only Radix) — renders a plain styled label with a `title` tooltip
// so the required marker still has an accessible hint without shipping JS.
const RequiredBadge = () => (
  <span
    aria-label="Required field"
    title="Required"
    className={cn(
      "flex size-4 shrink-0 items-center justify-center rounded-[8px] bg-destructive/15 text-destructive",
      "ml-auto mr-1",
    )}
  >
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>Required</title>
      <path
        d="M12.3892 5.68944L12.793 6.92754L9.02484 8.21946L11.4741 11.53L10.4244 12.3375L7.94824 8.91925L5.57971 12.3106L4.53002 11.5031L6.89855 8.21946L3.15735 6.95445L3.58799 5.68944L7.27536 7.00828V3.02484H8.64803V6.98137L12.3892 5.68944Z"
        fill="currentColor"
      />
    </svg>
  </span>
);

const ServerFieldLabel = ({
  text,
  labelType,
  htmlFor,
  required,
}: {
  text: string;
  labelType?: string;
  htmlFor: string;
  required?: boolean;
}) => {
  if (!text) return null;
  const badge = required ? <RequiredBadge /> : null;

  if (labelType === "h1") {
    return (
      <div className="flex w-full items-center py-2.5">
        <h1 className="flex-1 font-bold font-heading text-4xl">{text}</h1>
        {badge}
      </div>
    );
  }
  if (labelType === "h2") {
    return (
      <div className="flex w-full items-center py-2.5">
        <h2 className="flex-1 font-heading font-semibold text-2xl">{text}</h2>
        {badge}
      </div>
    );
  }
  if (labelType === "h3") {
    return (
      <div className="flex w-full items-center py-2.5">
        <h3 className="flex-1 font-heading font-semibold text-xl">{text}</h3>
        {badge}
      </div>
    );
  }
  if (labelType === "blockquote") {
    return (
      <div className="flex w-full items-center py-2.5">
        <blockquote className="flex-1 border-l-2 pl-6 italic">{text}</blockquote>
        {badge}
      </div>
    );
  }

  return (
    <label
      htmlFor={htmlFor}
      data-slot="label"
      className="gap-2 text-sm flex items-center select-none w-full py-2.5"
    >
      <span className="flex-1">{text}</span>
      {badge}
    </label>
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
  const keyedItems = grouped.map((item, idx) => {
    if (item.type === "static") {
      const firstNode = item.nodes[0] as { id?: string; type?: string } | undefined;
      return {
        ...item,
        key: firstNode?.id
          ? `static-${firstNode.id}`
          : `static-${idx}-${firstNode?.type ?? "?"}-${item.nodes.length}`,
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
            const field = item.field;
            if (field.fieldType === "Button") {
              return <Field key={item.key} fieldId={field.id} field={field} />;
            }
            const label = "label" in field ? (field.label ?? "") : "";
            const required = "required" in field ? !!field.required : false;
            const labelType = "labelType" in field ? field.labelType : undefined;
            return (
              <div
                key={item.key}
                data-bf-input="true"
                data-bf-standalone={label ? undefined : "true"}
              >
                <ServerFieldLabel
                  text={label}
                  labelType={labelType}
                  htmlFor={field.name}
                  required={required}
                />
                <Field fieldId={field.id} field={field} />
              </div>
            );
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

    // Gated responses (password, closed, limit) and missing forms vary per
    // viewer or per moment — bypass the shared cache. Only the happy path
    // is safe to tag-cache and purge on publish/branding/delete.
    applyFormCacheHeaders(data.id, { gated: !(base.form && !base.gated) });

    const { steps, thankYouNodes }: PreviewStepResult = base.form
      ? transformPlateForPreview(base.form.content as Value)
      : { steps: [], thankYouNodes: null };

    const [stepComponents, thankYou] = await Promise.all([
      Promise.all(steps.map((segs) => renderStepComponent(segs))),
      renderThankYouComponent(thankYouNodes),
    ]);

    // Resolve the hashed chunk URLs for step-1 field widgets so the route's
    // `head()` can emit <link rel="modulepreload"> — browser fetches them in
    // parallel with main JS instead of waiting for the lazy import to trigger.
    const firstStepFieldTypes = stepComponents[0]
      ? [...new Set(stepComponents[0].fields.map((f) => f.fieldType))]
      : [];
    const preloadModuleUrls = await getFieldChunkUrls(firstStepFieldTypes);

    return {
      ...base,
      steps: stepComponents,
      stepCount: steps.length,
      thankYou,
      preloadModuleUrls,
    };
  });
