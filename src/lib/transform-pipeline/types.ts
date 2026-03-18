import type { Value } from "platejs";

// --- Form header ---

export type FormHeaderData = {
  title: string;
  icon: string | null;
  iconColor: string | null;
  cover: string | null;
};

// --- Form fields ---

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
      fieldType: "Button";
      buttonText?: string;
      buttonRole: "next" | "previous" | "submit";
    };

// --- Static elements ---

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

// --- Preview segments ---

export type StaticSegment = { type: "static"; nodes: Value };
export type FieldSegment = { type: "field"; field: PlateFormField };
export type PreviewSegment = StaticSegment | FieldSegment;

// --- Step data ---

export type StepData = {
  /** Array of steps, each containing segments for that step */
  steps: PreviewSegment[][];
  /** Raw Plate nodes for thank-you page (rendered entirely via PlateStatic) */
  thankYouNodes: Value | null;
};

/**
 * Full preview data returned by preparePreview
 */
export type PreviewData = StepData;
