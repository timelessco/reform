/**
 * Unified node parsing for Plate editor content.
 *
 * Consolidates the duplicated logic from transform-plate-to-form.ts and
 * transform-plate-for-preview.ts into a single module.
 */
import type { Value } from "platejs";
import type {
  FormHeaderData,
  PlateFormField,
  PreviewSegment,
  TransformedElement,
} from "./types";

// --- Text extraction helpers ---

/**
 * Extracts plain text content from a Plate node's children array.
 */
export const extractTextContent = (children: Array<{ text?: string }>): string => {
  if (!Array.isArray(children)) return "";
  return children
    .map((child) => child.text || "")
    .join("")
    .trim();
};

/**
 * Generates a slugified name from a label string.
 * Example: "Email Address" -> "email_address"
 */
const NON_ALNUM_RE = /[^a-z0-9]+/g;
const TRIM_UNDERSCORES_RE = /^_|_$/g;

export const slugify = (str: string): string =>
  str.toLowerCase().replace(NON_ALNUM_RE, "_").replace(TRIM_UNDERSCORES_RE, "") || "field";

// --- Form header extraction ---

/**
 * Extracts form header data from the first node if it's a formHeader.
 */
export const extractFormHeader = (value: Value): FormHeaderData | null => {
  if (value.length > 0 && value[0].type === "formHeader") {
    const node = value[0];
    return {
      title: (node.title as string) || "",
      icon: (node.icon as string | null) || null,
      iconColor: (node.iconColor as string | null) || null,
      cover: (node.cover as string | null) || null,
    };
  }
  return null;
};

// --- List / table extraction helpers ---

/**
 * Extracts list items from a Plate list node (ul/ol).
 * Handles nested structure: ul > li > lic > text
 */
const extractListItems = (node: any): string[] => {
  const items: string[] = [];
  if (!node.children || !Array.isArray(node.children)) return items;

  for (const li of node.children) {
    if (li.type === "li" && li.children) {
      // List item content is typically in a "lic" (list item content) node
      for (const child of li.children) {
        if (child.type === "lic" || child.type === "p") {
          const text = extractTextContent(child.children);
          if (text) items.push(text);
        } else if (child.text !== undefined) {
          // Direct text child
          const text = child.text?.trim();
          if (text) items.push(text);
        }
      }
    }
  }
  return items;
};

/**
 * Extracts table rows from a Plate table node.
 * Handles structure: table > tr > (th|td) > text
 */
const extractTableRows = (node: any): { cells: string[]; isHeader: boolean }[] => {
  const rows: { cells: string[]; isHeader: boolean }[] = [];
  if (!node.children || !Array.isArray(node.children)) return rows;

  for (const tr of node.children) {
    if (tr.type === "tr" && tr.children) {
      const cells: string[] = [];
      let isHeader = false;

      for (const cell of tr.children) {
        if (cell.type === "th") {
          isHeader = true;
        }
        // Extract text from cell - cells often have p > text structure
        let cellText = "";
        if (cell.children) {
          for (const cellChild of cell.children) {
            if (cellChild.type === "p" && cellChild.children) {
              cellText += extractTextContent(cellChild.children);
            } else if (cellChild.text !== undefined) {
              cellText += cellChild.text;
            }
          }
        }
        cells.push(cellText.trim());
      }

      if (cells.length > 0) {
        rows.push({ cells, isHeader });
      }
    }
  }
  return rows;
};

// --- Shared field parsing ---

/**
 * Parses a formLabel + (optional formInput/formTextarea) pair into a PlateFormField.
 * Returns the field and how many nodes were consumed (1 or 2).
 */
const parseFormLabelPair = (
  nodes: any[],
  i: number,
  fieldIndex: number,
): { field: PlateFormField; consumed: number } => {
  const node = nodes[i];
  const labelText = extractTextContent(node.children as Array<{ text?: string }>);
  const isRequired = Boolean(node.required);

  // Check if next node is a formInput or formTextarea
  const nextNode = nodes[i + 1];
  let placeholder = "";
  let minLength: number | undefined;
  let maxLength: number | undefined;
  let defaultValue: string | undefined;
  let fieldType: "Input" | "Textarea" = "Input";
  let consumed = 1;

  if (nextNode && (nextNode.type === "formInput" || nextNode.type === "formTextarea")) {
    fieldType = nextNode.type === "formTextarea" ? "Textarea" : "Input";
    const inputText = extractTextContent(nextNode.children as Array<{ text?: string }>);
    placeholder = inputText || (nextNode.placeholder as string) || "";
    minLength = nextNode.minLength as number | undefined;
    maxLength = nextNode.maxLength as number | undefined;
    defaultValue = nextNode.defaultValue as string | undefined;
    consumed = 2;
  }

  // Use Plate.js element ID as stable field name (doesn't change when fields are reordered)
  const stableId = (node as { id?: string }).id;
  const baseName = slugify(labelText);
  // Fallback to position-based name for backward compatibility with old content
  const name = stableId || `${baseName}_${fieldIndex}`;

  return {
    field: {
      id: name,
      name,
      fieldType,
      label: labelText || "Untitled Field",
      placeholder: placeholder || undefined,
      required: isRequired,
      minLength,
      maxLength,
      defaultValue,
    },
    consumed,
  };
};

/**
 * Parses a formButton node into a PlateFormField.
 */
const parseFormButton = (node: any, fieldIndex: number): PlateFormField => {
  // Get button text from label property (new), children (old), or buttonText (legacy)
  const childText = extractTextContent(node.children as Array<{ text?: string }>);
  const btnText =
    (node.label as string | undefined) ||
    childText ||
    (node.buttonText as string | undefined);
  const btnRole = (node.buttonRole as "next" | "previous" | "submit") || "submit";
  const defaultText =
    btnRole === "next" ? "Next" : btnRole === "previous" ? "Previous" : "Submit";
  const name = `button_${fieldIndex}`;

  return {
    id: name,
    name,
    fieldType: "Button",
    buttonText: btnText || defaultText,
    buttonRole: btnRole,
  };
};

// --- Flat element parsing (used by transformPlateStateToFormElements) ---

/**
 * Transforms Plate.js editor Value into form elements suitable for preview.
 *
 * Supports:
 * - formLabel + formInput pairs -> Input fields
 * - formLabel + formTextarea pairs -> Textarea fields
 * - h1, h2, h3 -> Static headings
 * - hr -> Separator
 * - p, blockquote -> Description text
 *
 * @param value - Plate editor content array
 * @returns Array of elements for preview rendering
 */
export const transformPlateStateToFormElements = (value: Value): TransformedElement[] => {
  const elements: TransformedElement[] = [];
  let fieldIndex = 0;

  let i = 0;
  while (i < value.length) {
    const node = value[i];
    const nodeType = node.type as string;

    switch (nodeType) {
      case "formHeader":
        break;

      case "formLabel": {
        const { field, consumed } = parseFormLabelPair(value as any[], i, fieldIndex);
        elements.push(field);
        fieldIndex++;
        i += consumed;
        continue; // skip the i++ at the end
      }

      // Headings -> Static elements
      case "h1": {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          elements.push({
            id: `h1_${elements.length}`,
            name: `h1_${elements.length}`,
            fieldType: "H1",
            content,
            static: true,
          });
        }
        break;
      }

      case "h2": {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          elements.push({
            id: `h2_${elements.length}`,
            name: `h2_${elements.length}`,
            fieldType: "H2",
            content,
            static: true,
          });
        }
        break;
      }

      case "h3": {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          elements.push({
            id: `h3_${elements.length}`,
            name: `h3_${elements.length}`,
            fieldType: "H3",
            content,
            static: true,
          });
        }
        break;
      }

      // Horizontal rule -> Separator
      case "hr": {
        elements.push({
          id: `sep_${elements.length}`,
          name: `sep_${elements.length}`,
          fieldType: "Separator",
          static: true,
        });
        break;
      }

      // Page break -> PageBreak
      case "pageBreak": {
        const isThankYouPage = Boolean(node.isThankYouPage);
        elements.push({
          id: `page_${elements.length}`,
          name: `page_${elements.length}`,
          fieldType: "PageBreak",
          isThankYouPage,
          static: true,
        });
        break;
      }

      // Paragraphs/blockquotes -> Description or EmptyBlock
      case "p":
      case "blockquote": {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          // Non-empty paragraph -> Description
          elements.push({
            id: `desc_${elements.length}`,
            name: `desc_${elements.length}`,
            fieldType: "FieldDescription",
            content,
            static: true,
          });
        } else {
          // Empty paragraph -> EmptyBlock (for spacing)
          elements.push({
            id: `empty_${elements.length}`,
            name: `empty_${elements.length}`,
            fieldType: "EmptyBlock",
            static: true,
          });
        }
        break;
      }

      // Skip formInput/formTextarea if standalone (already handled with formLabel)
      case "formInput":
      case "formTextarea":
        break;

      // Button field
      case "formButton": {
        const field = parseFormButton(node, fieldIndex);
        elements.push(field);
        fieldIndex++;
        break;
      }

      // Unordered list
      case "ul": {
        const items = extractListItems(node);
        if (items.length > 0) {
          elements.push({
            id: `ul_${elements.length}`,
            name: `ul_${elements.length}`,
            fieldType: "UnorderedList",
            items,
            static: true,
          });
        }
        break;
      }

      // Ordered list
      case "ol": {
        const items = extractListItems(node);
        if (items.length > 0) {
          elements.push({
            id: `ol_${elements.length}`,
            name: `ol_${elements.length}`,
            fieldType: "OrderedList",
            items,
            static: true,
          });
        }
        break;
      }

      // Toggle (collapsible)
      case "toggle": {
        // First child is typically the toggle title, rest is content
        const children = node.children as any[];
        let title = "";
        const contentNodes: any[] = [];

        if (children && children.length > 0) {
          // Extract title from first element
          if (children[0].children) {
            title = extractTextContent(children[0].children);
          } else if (children[0].text) {
            title = children[0].text;
          }
          // Rest are content
          contentNodes.push(...children.slice(1));
        }

        // Recursively transform toggle content
        const toggleContent = transformPlateStateToFormElements(contentNodes as Value);

        elements.push({
          id: `toggle_${elements.length}`,
          name: `toggle_${elements.length}`,
          fieldType: "Toggle",
          title: title || "Toggle",
          children: toggleContent,
          static: true,
        });
        break;
      }

      // Table
      case "table": {
        const rows = extractTableRows(node);
        if (rows.length > 0) {
          elements.push({
            id: `table_${elements.length}`,
            name: `table_${elements.length}`,
            fieldType: "Table",
            rows,
            static: true,
          });
        }
        break;
      }

      // Callout
      case "callout": {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        const emoji = node.emoji as string | undefined;
        elements.push({
          id: `callout_${elements.length}`,
          name: `callout_${elements.length}`,
          fieldType: "Callout",
          emoji,
          content: content || "",
          static: true,
        });
        break;
      }

      default:
        // Skip unsupported node types
        break;
    }

    i++;
  }

  return elements;
};

// --- Preview segment parsing (used by transformPlateForPreview) ---

/**
 * Walks an array of Plate nodes and produces an ordered list of segments.
 * Consecutive static nodes are grouped into a single StaticSegment.
 * Form nodes (formLabel+formInput, formButton) become FieldSegments.
 */
export const createSegments = (nodes: Value): PreviewSegment[] => {
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

        const { field, consumed } = parseFormLabelPair(nodes as any[], i, fieldIndex);
        segments.push({ type: "field", field });
        fieldIndex++;
        i += consumed;
        continue; // skip the i++ at the end
      }

      case "formButton": {
        flushStatic();

        const field = parseFormButton(node, fieldIndex);
        segments.push({ type: "field", field });
        fieldIndex++;
        break;
      }

      // Skip standalone formInput/formTextarea (handled with formLabel above)
      case "formInput":
      case "formTextarea":
        break;

      default:
        // Everything else is static content -- accumulate into buffer
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
 * Filters only editable form fields (non-static elements)
 */
export const getEditableFields = (elements: TransformedElement[]): PlateFormField[] =>
  elements.filter((el): el is PlateFormField => !("static" in el) || !el.static);

/**
 * Extracts PlateFormField items from a segment array.
 * Used by StepForm to set up form validation.
 */
export const getFieldsFromSegments = (segments: PreviewSegment[]): PlateFormField[] =>
  segments
    .filter((seg): seg is { type: "field"; field: PlateFormField } => seg.type === "field")
    .map((seg) => seg.field);

/**
 * Extracts only editable (non-button) fields from segments.
 * Used for form field count checks and auto-jump logic.
 */
export const getEditableFieldsFromSegments = (segments: PreviewSegment[]): PlateFormField[] =>
  getFieldsFromSegments(segments).filter(
    (f) => f.fieldType === "Input" || f.fieldType === "Textarea",
  );
