import type { Value } from "platejs";
import { extractTextContent, slugify } from "./transform-plate-to-form";
import type { PlateFormField } from "./transform-plate-to-form";

// --- Segment types ---

export type StaticSegment = { type: "static"; nodes: Value };
export type FieldSegment = { type: "field"; field: PlateFormField };
export type PreviewSegment = StaticSegment | FieldSegment;

export type PreviewStepResult = {
  /** Array of steps, each containing segments for that step */
  steps: PreviewSegment[][];
  /** Raw Plate nodes for thank-you page (rendered entirely via PlateStatic) */
  thankYouNodes: Value | null;
};

// --- Core transform ---

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
export const transformPlateForPreview = (value: Value): PreviewStepResult => {
  // Skip formHeader node (handled separately by extractFormHeader)
  let startIdx = 0;
  if (value.length > 0 && value[0].type === "formHeader") {
    startIdx = 1;
  }

  const remaining = value.slice(startIdx);

  // Split remaining nodes on pageBreak into raw step arrays
  const rawSteps: Value[] = [];
  let thankYouNodes: Value | null = null;
  let currentChunk: Value = [];
  let collectingThankYou = false;

  for (const node of remaining) {
    if (node.type === "pageBreak") {
      // Flush current chunk as a step
      if (currentChunk.length > 0 && !collectingThankYou) {
        rawSteps.push(currentChunk);
        currentChunk = [];
      }

      if (node.isThankYouPage) {
        collectingThankYou = true;
      }
      continue;
    }

    if (collectingThankYou) {
      if (!thankYouNodes) thankYouNodes = [];
      thankYouNodes.push(node);
    } else {
      currentChunk.push(node);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0 && !collectingThankYou) {
    rawSteps.push(currentChunk);
  }

  // If no steps were created but we have content, it's a single step
  if (rawSteps.length === 0 && currentChunk.length > 0) {
    rawSteps.push(currentChunk);
  }

  // Convert each raw step into segments
  const steps = rawSteps.map((stepNodes) => createSegments(stepNodes));

  return { steps, thankYouNodes };
};

/**
 * Walks an array of Plate nodes and produces an ordered list of segments.
 * Consecutive static nodes are grouped into a single StaticSegment.
 * Form nodes (formLabel+formInput, formButton) become FieldSegments.
 */
const createSegments = (nodes: Value): PreviewSegment[] => {
  const segments: PreviewSegment[] = [];
  let staticBuffer: Value = [];
  let fieldIndex = 0;

  const flushStatic = () => {
    if (staticBuffer.length > 0) {
      segments.push({ type: "static", nodes: staticBuffer });
      staticBuffer = [];
    }
  };

  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    const nodeType = node.type as string;

    switch (nodeType) {
      case "formLabel": {
        flushStatic();

        const labelText = extractTextContent(node.children as Array<{ text?: string }>);
        const isRequired = Boolean(node.required);

        // Map node types to field types
        const typeMap: Record<string, string> = {
          formInput: "Input",
          formTextarea: "Textarea",
          formEmail: "Email",
          formPhone: "Phone",
          formNumber: "Number",
          formLink: "Link",
          formDate: "Date",
          formTime: "Time",
          formFileUpload: "FileUpload",
        };

        // Check if next nodes are formOptionItem (compound field)
        const nextNode = nodes[i + 1];
        if (nextNode && (nextNode.type as string) === "formOptionItem") {
          const variant = (nextNode.variant as string) || "checkbox";
          const variantToFieldType: Record<string, string> = {
            checkbox: "Checkbox",
            multiChoice: "MultiChoice",
            multiSelect: "MultiSelect",
            ranking: "Ranking",
          };

          const options: { value: string; label: string }[] = [];
          let j = i + 1;
          while (j < nodes.length && (nodes[j].type as string) === "formOptionItem") {
            const optText = extractTextContent(nodes[j].children as Array<{ text?: string }>);
            const label = optText || `Option ${options.length + 1}`;
            options.push({ value: slugify(label) || `option_${options.length + 1}`, label });
            j++;
          }
          i = j - 1;

          const stableId = (node as { id?: string }).id;
          const baseName = slugify(labelText);
          const name = stableId || `${baseName}_${fieldIndex}`;

          segments.push({
            type: "field",
            field: {
              id: name,
              name,
              fieldType: variantToFieldType[variant] || "Checkbox",
              label: labelText || "Untitled Field",
              required: isRequired,
              options,
            } as PlateFormField,
          });
          fieldIndex++;
          break;
        }

        // Peek ahead for recognized form input type
        let placeholder = "";
        let minLength: number | undefined;
        let maxLength: number | undefined;
        let defaultValue: string | undefined;
        let fieldType: string = "Input";
        if (nextNode && typeMap[nextNode.type as string]) {
          fieldType = typeMap[nextNode.type as string];
          const inputText = extractTextContent(nextNode.children as Array<{ text?: string }>);
          placeholder = inputText || (nextNode.placeholder as string) || "";
          minLength = nextNode.minLength as number | undefined;
          maxLength = nextNode.maxLength as number | undefined;
          defaultValue = nextNode.defaultValue as string | undefined;
          i++; // Skip the form input node
        }

        // Use Plate element ID as stable field name
        const stableId = (node as { id?: string }).id;
        const baseName = slugify(labelText);
        const name = stableId || `${baseName}_${fieldIndex}`;

        const field: PlateFormField = {
          id: name,
          name,
          fieldType: fieldType as PlateFormField["fieldType"],
          label: labelText || "Untitled Field",
          placeholder: placeholder || undefined,
          required: isRequired,
          minLength,
          maxLength,
          defaultValue,
        } as PlateFormField;

        segments.push({ type: "field", field });
        fieldIndex++;
        break;
      }

      case "formButton": {
        flushStatic();

        const childText = extractTextContent(node.children as Array<{ text?: string }>);
        const btnText =
          (node.label as string | undefined) ||
          childText ||
          (node.buttonText as string | undefined);
        const btnRole = (node.buttonRole as "next" | "previous" | "submit") || "submit";
        const defaultText =
          btnRole === "next" ? "Next" : btnRole === "previous" ? "Previous" : "Submit";
        const name = `button_${fieldIndex}`;

        segments.push({
          type: "field",
          field: {
            id: name,
            name,
            fieldType: "Button",
            buttonText: btnText || defaultText,
            buttonRole: btnRole,
          },
        });
        fieldIndex++;
        break;
      }

      // Skip standalone form input nodes (handled with formLabel above)
      case "formInput":
      case "formTextarea":
      case "formEmail":
      case "formPhone":
      case "formNumber":
      case "formLink":
      case "formDate":
      case "formTime":
      case "formFileUpload":
        break;

      default:
        // Everything else is static content — accumulate into buffer
        staticBuffer.push(node);
        break;
    }

    i++;
  }

  flushStatic();
  return segments;
};

// --- Utility functions ---

/**
 * Extracts PlateFormField items from a segment array.
 * Used by StepForm to set up form validation.
 */
export const getFieldsFromSegments = (segments: PreviewSegment[]): PlateFormField[] =>
  segments.filter((seg): seg is FieldSegment => seg.type === "field").map((seg) => seg.field);

/**
 * Extracts only editable (non-button) fields from segments.
 * Used for form field count checks and auto-jump logic.
 */
const EDITABLE_FIELD_TYPES = new Set([
  "Input",
  "Textarea",
  "Email",
  "Phone",
  "Number",
  "Link",
  "Date",
  "Time",
  "FileUpload",
  "Checkbox",
  "MultiChoice",
  "MultiSelect",
  "Ranking",
]);

export const getEditableFieldsFromSegments = (segments: PreviewSegment[]): PlateFormField[] =>
  getFieldsFromSegments(segments).filter((f) => EDITABLE_FIELD_TYPES.has(f.fieldType));
