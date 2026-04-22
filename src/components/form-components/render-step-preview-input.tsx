import { lazy, Suspense } from "react";

import type { AppForm } from "@/hooks/use-form-builder";
import type { PlateFormField } from "@/lib/editor/transform-plate-to-form";
import { FieldLabelText } from "./fields/shared";
import type { FieldType } from "./fields/shared";

// One chunk per field type. A form that only uses Input + Textarea pulls only
// those two chunks — PhoneInput, DatePicker, MultiSelect, useFileUpload, etc.
// stay out of the critical path.
const FIELD_RENDERERS: Record<
  FieldType,
  React.LazyExoticComponent<React.ComponentType<{ element: never; form: AppForm }>>
> = {
  Input: lazy(() => import("./fields/InputField")),
  Textarea: lazy(() => import("./fields/TextareaField")),
  Email: lazy(() => import("./fields/EmailField")),
  Phone: lazy(() => import("./fields/PhoneField")),
  Number: lazy(() => import("./fields/NumberField")),
  Link: lazy(() => import("./fields/LinkField")),
  Date: lazy(() => import("./fields/DateField")),
  Time: lazy(() => import("./fields/TimeField")),
  FileUpload: lazy(() => import("./fields/FileUploadField")),
  Checkbox: lazy(() => import("./fields/CheckboxField")),
  MultiChoice: lazy(() => import("./fields/MultiChoiceField")),
  MultiSelect: lazy(() => import("./fields/MultiSelectField")),
  Ranking: lazy(() => import("./fields/RankingField")),
} as const;

interface RenderStepPreviewInputProps {
  element: PlateFormField;
  form: AppForm;
}

// Just the field input (lazy-loaded) with no label/wrapper. Used by the RSC
// flow where the server-rendered composite already provides the surrounding
// `<div data-bf-input>` + label.
export const RenderFieldComponent = ({ element, form }: RenderStepPreviewInputProps) => {
  if (element.fieldType === "Button") return null;
  const Component = FIELD_RENDERERS[element.fieldType as FieldType];
  if (!Component) return null;
  return (
    <Suspense fallback={null}>
      <Component element={element as never} form={form} />
    </Suspense>
  );
};

export const RenderStepPreviewInput = ({ element, form }: RenderStepPreviewInputProps) => {
  if (element.fieldType === "Button") return null;
  const Component = FIELD_RENDERERS[element.fieldType as FieldType];
  if (!Component) return null;

  const label = "label" in element ? (element.label ?? "") : "";
  const required = "required" in element ? !!element.required : false;
  const labelType = "labelType" in element ? element.labelType : undefined;

  return (
    <div data-bf-input="true" data-bf-standalone={label ? undefined : "true"}>
      <FieldLabelText
        text={label}
        labelType={labelType}
        htmlFor={element.name}
        required={required}
      />
      <Suspense fallback={null}>
        <Component element={element as never} form={form} />
      </Suspense>
    </div>
  );
};
