import type { Value } from "platejs";
import type { FormElement, StaticFormElement } from "@/types/form-types";

type _PreviewElement = FormElement | StaticFormElement;

/** Loose Plate node shape for tree traversal in extractors */
interface PlateNode {
  type?: string;
  text?: string;
  children?: PlateNode[];
  [key: string]: unknown;
}

type FormHeaderData = {
  title: string;
  icon: string | null;
  iconColor: string | null;
  cover: string | null;
};

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

export type PlateFormField =
  | {
      id: string;
      name: string;
      fieldType: "Input";
      label?: string;
      placeholder?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      defaultValue?: string;
    }
  | {
      id: string;
      name: string;
      fieldType: "Textarea";
      label?: string;
      placeholder?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      defaultValue?: string;
    }
  | {
      id: string;
      name: string;
      fieldType: "Email";
      label?: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Phone";
      label?: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Number";
      label?: string;
      placeholder?: string;
      required?: boolean;
      min?: number;
      max?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Link";
      label?: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Date";
      label?: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Time";
      label?: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "FileUpload";
      label?: string;
      required?: boolean;
      accept?: string;
    }
  | {
      id: string;
      name: string;
      fieldType: "Checkbox";
      label?: string;
      required?: boolean;
      options: { value: string; label: string }[];
    }
  | {
      id: string;
      name: string;
      fieldType: "MultiChoice";
      label?: string;
      required?: boolean;
      options: { value: string; label: string }[];
    }
  | {
      id: string;
      name: string;
      fieldType: "MultiSelect";
      label?: string;
      required?: boolean;
      options: { value: string; label: string }[];
    }
  | {
      id: string;
      name: string;
      fieldType: "Ranking";
      label?: string;
      required?: boolean;
      options: { value: string; label: string }[];
    }
  | {
      id: string;
      name: string;
      fieldType: "Button";
      buttonText?: string;
      buttonRole: "next" | "previous" | "submit";
    };

export type PlateStaticElement =
  | { id: string; fieldType: "H1"; content: string; static: true; name: string }
  | { id: string; fieldType: "H2"; content: string; static: true; name: string }
  | { id: string; fieldType: "H3"; content: string; static: true; name: string }
  | { id: string; fieldType: "Separator"; static: true; name: string }
  | { id: string; fieldType: "EmptyBlock"; static: true; name: string }
  | {
      id: string;
      fieldType: "FieldDescription";
      content: string;
      static: true;
      name: string;
    }
  | {
      id: string;
      fieldType: "PageBreak";
      isThankYouPage: boolean;
      static: true;
      name: string;
    }
  | {
      id: string;
      fieldType: "UnorderedList";
      items: string[];
      static: true;
      name: string;
    }
  | {
      id: string;
      fieldType: "OrderedList";
      items: string[];
      static: true;
      name: string;
    }
  | {
      id: string;
      fieldType: "Toggle";
      title: string;
      children: TransformedElement[];
      static: true;
      name: string;
    }
  | {
      id: string;
      fieldType: "Table";
      rows: { cells: string[]; isHeader: boolean }[];
      static: true;
      name: string;
    }
  | {
      id: string;
      fieldType: "Callout";
      emoji?: string;
      content: string;
      static: true;
      name: string;
    };

/**
 * Combined type for all preview elements
 */
export type TransformedElement = PlateFormField | PlateStaticElement;

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

/**
 * Extracts list items from a Plate list node (ul/ol).
 * Handles nested structure: ul > li > lic > text
 */
const extractListItems = (node: PlateNode): string[] => {
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
const extractTableRows = (node: PlateNode): { cells: string[]; isHeader: boolean }[] => {
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
        const nextNode = value[i + 1];
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
          while (j < value.length && (value[j].type as string) === "formOptionItem") {
            const optText = extractTextContent(value[j].children as Array<{ text?: string }>);
            const label = optText || `Option ${options.length + 1}`;
            options.push({ value: slugify(label) || `option_${options.length + 1}`, label });
            j++;
          }
          i = j - 1; // Skip consumed option nodes

          const stableId = (node as { id?: string }).id;
          const baseName = slugify(labelText);
          const name = stableId || `${baseName}_${fieldIndex}`;

          elements.push({
            id: name,
            name,
            fieldType: variantToFieldType[variant] || "Checkbox",
            label: labelText || "Untitled Field",
            required: isRequired,
            options,
          } as PlateFormField);
          fieldIndex++;
          break;
        }

        // Check if next node is a recognized form input type
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

          i++; // Skip the form input node in the next iteration
        }

        // Use Plate.js element ID as stable field name (doesn't change when fields are reordered)
        const stableId = (node as { id?: string }).id;
        const baseName = slugify(labelText);
        // Fallback to position-based name for backward compatibility with old content
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

        elements.push(field);
        fieldIndex++;
        break;
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

      // Skip form input nodes if standalone (already handled with formLabel)
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

      // Button field
      case "formButton": {
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
        elements.push({
          id: name,
          name,
          fieldType: "Button",
          buttonText: btnText || defaultText,
          buttonRole: btnRole,
        });
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
        const children = node.children as PlateNode[];
        let title = "";
        const contentNodes: PlateNode[] = [];

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

/**
 * Filters only editable form fields (non-static elements)
 */
export const getEditableFields = (elements: TransformedElement[]): PlateFormField[] =>
  elements.filter((el): el is PlateFormField => !("static" in el) || !el.static);

/**
 * Generates default form values from a list of form fields.
 * Used to initialize TanStack Form with empty values.
 */
const _generateDefaultValues = (elements: TransformedElement[]): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};

  for (const el of elements) {
    if (!("static" in el) || !el.static) {
      defaults[(el as PlateFormField).name] = "";
    }
  }

  return defaults;
};

/**
 * Result of splitting elements into steps
 */
type StepSplitResult = {
  /** Array of steps, each containing elements for that step */
  steps: TransformedElement[][];
  /** Content to show after form submission (from thank you page break) */
  thankYouContent: TransformedElement[] | null;
};

/**
 * Splits transformed elements into steps based on PageBreak elements.
 * - Regular PageBreak = step divider
 * - PageBreak with isThankYouPage = marks content after it as thank you content
 *
 * @param elements - Array of transformed elements
 * @returns Object with steps array and optional thankYouContent
 */
export const splitElementsIntoSteps = (elements: TransformedElement[]): StepSplitResult => {
  const steps: TransformedElement[][] = [];
  let currentStep: TransformedElement[] = [];
  let thankYouContent: TransformedElement[] | null = null;
  let isCollectingThankYou = false;

  for (const element of elements) {
    // Check if this is a PageBreak
    if ("static" in element && element.fieldType === "PageBreak") {
      // Save current step if it has content
      if (currentStep.length > 0) {
        steps.push(currentStep);
        currentStep = [];
      }

      // If this is a thank you page break, start collecting thank you content
      if (element.isThankYouPage) {
        isCollectingThankYou = true;
      }
      // Don't add the PageBreak element itself to any step
      continue;
    }

    // Add element to appropriate collection
    if (isCollectingThankYou) {
      if (!thankYouContent) {
        thankYouContent = [];
      }
      thankYouContent.push(element);
    } else {
      currentStep.push(element);
    }
  }

  // Don't forget the last step (if not collecting thank you content)
  if (currentStep.length > 0 && !isCollectingThankYou) {
    steps.push(currentStep);
  }

  // If no steps were created but we have content, it's a single step
  if (steps.length === 0 && currentStep.length > 0) {
    steps.push(currentStep);
  }

  return { steps, thankYouContent };
};
