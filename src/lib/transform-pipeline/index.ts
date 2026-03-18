/**
 * Transform Pipeline — unified module for converting Plate editor content
 * into form elements, preview segments, and validation schemas.
 */
import type { Value } from "platejs";
import type { PreviewData } from "./types";
import {
  extractFormHeader as _extractFormHeader,
  slugify as _slugify,
  transformPlateStateToFormElements,
  getEditableFields,
} from "./parse-nodes";
import { splitNodesIntoStepSegments } from "./split-steps";

// --- Primary API ---

/**
 * Transforms Plate editor Value into chunked preview segments.
 *
 * Static content (headings, paragraphs, blockquotes, code blocks, etc.)
 * is grouped into StaticSegments rendered by PlateStatic.
 * Form fields (Input, Textarea, Button) become FieldSegments
 * rendered by custom form components.
 *
 * Handles multi-step splitting on pageBreak nodes and
 * thank-you page extraction (isThankYouPage pageBreak).
 */
export function preparePreview(value: Value): PreviewData {
  // Skip formHeader node (handled separately by extractFormHeader)
  let startIdx = 0;
  if (value.length > 0 && value[0].type === "formHeader") {
    startIdx = 1;
  }

  const remaining = value.slice(startIdx);
  return splitNodesIntoStepSegments(remaining);
}

/**
 * Extracts form header data from the first node if it's a formHeader.
 */
export function extractFormHeader(value: Value) {
  return _extractFormHeader(value);
}

/**
 * Extracts the names of all editable (non-static, non-button) fields
 * from a Plate editor Value. Used by submissions page to build column headers.
 */
export function extractFieldNames(value: Value): string[] {
  const elements = transformPlateStateToFormElements(value);
  const fields = getEditableFields(elements);
  return fields
    .filter((f) => f.fieldType !== "Button")
    .map((f) => f.name);
}

/**
 * Generates a slugified name from a label string.
 * Example: "Email Address" -> "email_address"
 */
export function slugify(str: string) {
  return _slugify(str);
}

// --- Re-exports for callers that need internals ---

// Types
export type {
  FormHeaderData,
  PlateFormField,
  PlateStaticElement,
  TransformedElement,
  StaticSegment,
  FieldSegment,
  PreviewSegment,
  StepData,
  PreviewData,
} from "./types";

// Parse utilities used by callers
export {
  transformPlateStateToFormElements,
  getEditableFields,
  getFieldsFromSegments,
  getEditableFieldsFromSegments,
} from "./parse-nodes";

// Step splitting
export { splitElementsIntoSteps } from "./split-steps";

// Schema generation
export { generateZodSchemaFromFields, generateDefaultValuesFromFields } from "./schema";
