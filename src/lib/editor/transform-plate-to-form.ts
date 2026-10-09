import type { Descendant, TElement, Value } from "platejs";
import type { OptionLabelStyle } from "@/components/ui/form-option-item-constants";
import type { LabelTokenNode } from "@/lib/editor/resolve-mentions";
import type {
  DecimalSeparator,
  NumberFormatType,
  ThousandsSeparator,
} from "@/lib/form-schema/number-format";
import { extractFileUploadFields } from "@/lib/form-schema/file-upload-types";
import { normalizeOptionNodes } from "@/lib/editor/normalize-option-nodes";
import {
  ALLOWED_LABEL_TYPES,
  FORM_INPUT_NODE_TYPES,
  INPUT_TYPE_TO_FIELD_TYPE,
  VARIANT_TO_FIELD_TYPE,
  extractLinearScaleFields,
  extractNumberFields,
  extractRatingFields,
  resolveRequired,
} from "@/lib/form-schema/form-field-constants";
import * as v from "valibot";

/** Boundary readers for the open TElement props, which platejs types `unknown` via its
 * index signature. Each read narrows to a real domain type before use. */
export const isString = (value: unknown): value is string => v.is(v.string(), value);

const isNumber = (value: unknown): value is number => v.is(v.number(), value);

export const isPositiveNumber = (value: unknown): value is number =>
  v.is(v.number(), value) && value > 0;

const isNonEmptyString = (value: unknown): value is string =>
  v.is(v.string(), value) && value.length > 0;

export const isButtonRole = (value: unknown): value is "next" | "previous" | "submit" =>
  value === "next" || value === "previous" || value === "submit";

export const isOptionLabelStyle = (value: unknown): value is OptionLabelStyle =>
  value === "none" || value === "letters" || value === "numbers";

/** Props on TElement index as `unknown`; read one by name and narrow it. */
export const readString = (node: TElement, key: string): string | undefined => {
  const value = node[key];

  return isString(value) ? value : undefined;
};

export const readNumber = (node: TElement, key: string): number | undefined => {
  const value = node[key];

  return isNumber(value) ? value : undefined;
};

export const readNodeId = (node: TElement | null | undefined): string | undefined =>
  isString(node?.id) ? node?.id : undefined;

type FormHeaderData = {
  title: string;
  icon: string | null;
  iconColor: string | null;
  cover: string | null;
  coverPosition: number | null;
};

export const extractFormHeader = (value: Value): FormHeaderData | null => {
  if (value.length > 0 && value[0].type === "formHeader") {
    const node = value[0];

    return {
      title: readString(node, "title") || "",
      icon: readString(node, "icon") || null,
      iconColor: readString(node, "iconColor") || null,
      cover: readString(node, "cover") || null,
      coverPosition: readNumber(node, "coverPosition") ?? null,
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
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      defaultValue?: string;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Textarea";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      defaultValue?: string;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Email";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
      /** Require email verification before the submission is accepted (block-menu "Verify email"). */
      verifyEmail?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Phone";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      isFieldArray?: boolean;
      /** ISO codes whitelisted in the country dropdown; unset/empty ⇒ all countries, auto-detected. */
      allowedCountries?: string[];
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Number";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      min?: number;
      max?: number;
      allowDecimals?: boolean;
      defaultValue?: string;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
      /** Display formatting (block-menu "Format"); also persisted so the
       * submissions table can render the value the same way. */
      numberFormat?: NumberFormatType;
      decimalSeparator?: DecimalSeparator;
      thousandsSeparator?: ThousandsSeparator;
    }
  | {
      id: string;
      name: string;
      fieldType: "Link";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Date";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Time";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      placeholder?: string;
      required?: boolean;
      /** Railway/24-hour time entry (default 12-hour AM/PM). */
      use24Hour?: boolean;
      isFieldArray?: boolean;
      /** Initial row count when `isFieldArray` is on — used by the editor and
       * by `generateDefaultValuesFromFields` to seed that many empty rows. */
      initialRows?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "FileUpload";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      accept?: string;
      maxFileSize?: number;
      maxFiles?: number;
      allowedFileTypes?: string;
      allowedFileExtensions?: string[];
    }
  | {
      id: string;
      name: string;
      fieldType: "Checkbox";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      options: { value: string; label: string; image?: string }[];
      /** Leading marker style for the option group (Labels submenu). Default: native control. */
      optionLabel?: OptionLabelStyle;
      /** Render as a multi-select dropdown instead of a checkbox list. */
      showAsDropdown?: boolean;
      /** Render options as a picture-choice grid of cover-cropped image tiles. */
      showImage?: boolean;
      /** Randomize option order in the live form. */
      shuffle?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "MultiChoice";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      options: { value: string; label: string; image?: string }[];
      /** Leading marker style for the option group (Labels submenu). Default: letters. */
      optionLabel?: OptionLabelStyle;
      /** Render as a single-select dropdown instead of a radio list. */
      showAsDropdown?: boolean;
      /** Render options as a picture-choice grid of cover-cropped image tiles. */
      showImage?: boolean;
      /** Randomize option order in the live form. */
      shuffle?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Ranking";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      options: { value: string; label: string; image?: string }[];
      /** Randomize initial option order in the live form. */
      shuffle?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "LinearScale";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      /** Scale start, end, and increment — the live form renders a button per step. */
      min: number;
      max: number;
      step: number;
      /** Anchor labels rendered under the scale (Figma 25634-16668), e.g. Bad … Good. */
      anchorLeft?: string;
      anchorCenter?: string;
      anchorRight?: string;
    }
  | {
      id: string;
      name: string;
      fieldType: "Rating";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      /** Number of stars shown (default 5, configurable via the block menu). */
      starCount?: number;
    }
  | {
      id: string;
      name: string;
      fieldType: "Signature";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
    }
  | {
      id: string;
      name: string;
      fieldType: "Matrix";
      label?: string;
      labelType?: string;
      /** Raw label children — present only when the label contains `@`-mention tokens, so
       * the renderer can resolve them against live answers (see resolve-mentions). */
      labelNodes?: LabelTokenNode[];
      required?: boolean;
      /** Grid rows (the sub-questions) and columns (the answer scale). The
       * answer is a record keyed by row `value` → column `value` (single) or
       * column `value[]` (multiple). */
      rows: { value: string; label: string }[];
      columns: { value: string; label: string }[];
      /** Allow several column picks per row (checkbox) vs one (radio). */
      multiple?: boolean;
      /** Randomize row order in the live form. */
      shuffle?: boolean;
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

export type TransformedElement = PlateFormField | PlateStaticElement;

/** A Plate child that can carry text (text leaf, or an element with a stray text prop). */
const isTextBearingNode = (child: unknown): child is { text?: unknown } =>
  v.is(v.looseObject({ text: v.optional(v.unknown()) }), child);

export const extractTextContent = (children: ReadonlyArray<unknown>): string => {
  if (!Array.isArray(children)) return "";

  return children
    .map((child) => (isTextBearingNode(child) && isString(child.text) ? child.text : ""))
    .join("")
    .trim();
};

/** True when `type` is a Plate input that would consume a preceding label-eligible
 * block (p/h1-3/formLabel/blockquote) as its label. Lets extractors tell a label
 * apart from description prose: a `p` whose next block is one of these is a label. */
export const isFormInputType = (type: string | undefined): boolean =>
  type !== undefined && FORM_INPUT_NODE_TYPES.has(type);

/** Slugify a label, e.g. "Email Address" -> "email_address". */
const NON_ALNUM_RE = /[^a-z0-9]+/g;

const TRIM_UNDERSCORES_RE = /^_|_$/g;

export const slugify = (str: string): string =>
  str.toLowerCase().replace(NON_ALNUM_RE, "_").replace(TRIM_UNDERSCORES_RE, "") || "field";

/** formOptionItem nodes → {value,label}[] with values guaranteed unique even when
 * labels collide (e.g. two "Option 2" rows). Single-select must map a stored value
 * to exactly one option; duplicate values would highlight every matching row. */
export const buildOptionList = (
  nodes: ReadonlyArray<TElement>,
): { value: string; label: string; image?: string }[] => {
  const options: { value: string; label: string; image?: string }[] = [];
  const used = new Set<string>();

  for (const n of nodes) {
    const optText = extractTextContent(n.children ?? []);
    const optLabel = optText || `Option ${options.length + 1}`;
    let value = slugify(optLabel) || `option_${options.length + 1}`;

    if (used.has(value)) {
      let k = 2;

      while (used.has(`${value}_${k}`)) k++;
      value = `${value}_${k}`;
    }

    used.add(value);

    if (isNonEmptyString(n.image)) {
      options.push({ value, label: optLabel, image: n.image });
    } else {
      options.push({ value, label: optLabel });
    }
  }

  return options;
};

/** Matrix rows/columns ride on the void formMatrix node's props as a plain array. */
const isMatrixEntryList = (value: unknown): value is Array<{ label?: string }> =>
  Array.isArray(value);

/** Matrix row/column nodes → {value,label}[] with unique values even when labels
 * collide or are blank. Answers are keyed by row/column value, so duplicate values
 * would conflate distinct rows. Mirrors buildOptionList. */
export const buildMatrixEntries = (
  node: TElement,
  prefix: "row" | "column",
): { value: string; label: string }[] => {
  const entries: { value: string; label: string }[] = [];
  const used = new Set<string>();
  const raw = prefix === "row" ? node.rows : node.columns;
  const list = isMatrixEntryList(raw) ? raw : [];
  const fallback = prefix === "row" ? "Row" : "Column";

  for (const e of list) {
    const label = e.label || `${fallback} ${entries.length + 1}`;
    let value = slugify(label);

    if (used.has(value)) {
      let k = 2;

      while (used.has(`${value}_${k}`)) k++;
      value = `${value}_${k}`;
    }

    used.add(value);
    entries.push({ value, label });
  }

  return entries;
};

/** True for Plate element nodes (as opposed to text leaves). */
const isElementNode = (node: Descendant): node is TElement => "children" in node;

/** Extracts list items from a Plate list node (ul/ol). Structure: ul > li > lic > text. */
const extractListItems = (node: TElement): string[] => {
  const items: string[] = [];

  if (!node.children || !Array.isArray(node.children)) return items;

  for (const li of node.children) {
    if (isElementNode(li) && li.type === "li" && li.children) {
      // li content usually wrapped in a "lic" node.
      for (const child of li.children) {
        if (isElementNode(child) && (child.type === "lic" || child.type === "p")) {
          const text = extractTextContent(child.children);

          if (text) items.push(text);
        } else if (isString(child.text)) {
          const text = child.text.trim();

          if (text) items.push(text);
        }
      }
    }
  }

  return items;
};

/** Extracts table rows from a Plate table node. Structure: table > tr > (th|td) > text. */
const extractTableRows = (node: TElement): { cells: string[]; isHeader: boolean }[] => {
  const rows: { cells: string[]; isHeader: boolean }[] = [];

  if (!node.children || !Array.isArray(node.children)) return rows;

  for (const tr of node.children) {
    if (isElementNode(tr) && tr.type === "tr" && tr.children) {
      const cells: string[] = [];
      let isHeader = false;

      for (const cell of tr.children) {
        if (isElementNode(cell) && cell.type === "th") {
          isHeader = true;
        }

        // Cells often have p > text structure
        let cellText = "";

        if (isElementNode(cell) && cell.children) {
          for (const cellChild of cell.children) {
            if (isElementNode(cellChild) && cellChild.type === "p" && cellChild.children) {
              cellText += extractTextContent(cellChild.children);
            } else if (isString(cellChild.text)) {
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
 * Plate Value → exportable form elements via "input-looks-back": each input claims
 * value[i-1] as label; label nodes (formLabel/h1-3/p/blockquote) peek value[i+1] and
 * yield to a following input.
 * - form inputs + preceding label → typed fields
 * - formOptionItem runs + label → Checkbox/MultiChoice/Ranking
 * - h1-3 → headings; hr → Separator; p/blockquote → Description (unless consumed as labels)
 * @param rawValue - Plate editor content array
 * @returns Array of elements for form rendering
 */
export const transformPlateStateToFormElements = (rawValue: Value): TransformedElement[] => {
  // Published forms read stored content directly (no editor migration pass) — normalize legacy
  // dropdown/multi-select shapes here too.
  const value = normalizeOptionNodes(rawValue);
  const elements: TransformedElement[] = [];
  let fieldIndex = 0;

  /** Label-node indices consumed by a following input — skip in static processing. */
  const consumedIndices = new Set<number>();

  /** Look back at value[i-1]: if in ALLOWED_LABEL_TYPES, extract text, mark consumed,
   * pop from elements if it was the last pushed item. */
  const lookBackForLabel = (i: number): { labelText: string; labelNode: TElement } | null => {
    if (i <= 0) return null;
    const prev = value[i - 1];
    const prevType = prev.type;

    if (!ALLOWED_LABEL_TYPES.has(prevType)) return null;

    const labelText = extractTextContent(prev.children);
    consumedIndices.add(i - 1);

    // Pop label from elements if it was the most-recently pushed static item.
    if (elements.length > 0) {
      const last = elements[elements.length - 1];

      if ("static" in last && last.static) {
        // Does last static element match this label node?
        const lastId = last.id;
        const expectedPrefixes = ["h1_", "h2_", "h3_", "desc_", "empty_"];
        const isStaticLabel = expectedPrefixes.some((p) => lastId.startsWith(p));

        if (isStaticLabel) {
          // formLabel: always pop; heading/p/blockquote: pop only on content match.
          if (prevType === "formLabel") {
            elements.pop();
          } else {
            const lastContent = "content" in last ? last.content : "";

            if (lastContent === labelText || labelText === "") {
              elements.pop();
            }
          }
        }
      }
    }

    return { labelText, labelNode: prev };
  };

  let i = 0;

  while (i < value.length) {
    const node = value[i];
    const nodeType = node.type;

    // formHeader is handled separately
    if (nodeType === "formHeader") {
      i++;
      continue;
    }

    if (INPUT_TYPE_TO_FIELD_TYPE[nodeType]) {
      const label = lookBackForLabel(i);
      const labelText = label?.labelText ?? "";
      const labelNode = label?.labelNode ?? null;
      const isRequired = resolveRequired(node, labelNode);

      const inputText = extractTextContent(node.children);
      const placeholder = inputText || readString(node, "placeholder") || "";
      const minLength = readNumber(node, "minLength");
      const maxLength = readNumber(node, "maxLength");
      const defaultValue = readString(node, "defaultValue");
      const isFieldArray = node.isFieldArray === true ? true : undefined;
      const rawInitialRows = node.initialRows;

      const initialRows =
        isFieldArray && isPositiveNumber(rawInitialRows) ? Math.floor(rawInitialRows) : undefined;

      const stableId = readNodeId(label?.labelNode) ?? readNodeId(node);

      const baseName = slugify(labelText);
      const name = stableId || `${baseName}_${fieldIndex}`;

      const fileUploadFields = nodeType === "formFileUpload" ? extractFileUploadFields(node) : {};
      const numberFields = nodeType === "formNumber" ? extractNumberFields(node) : {};

      const linearScaleFields =
        nodeType === "formLinearScale" ? extractLinearScaleFields(node) : {};

      const ratingFields = nodeType === "formRating" ? extractRatingFields(node) : {};
      const verifyEmail = nodeType === "formEmail" && node.verifyEmail === true ? true : undefined;

      const allowedCountries =
        nodeType === "formPhone" && Array.isArray(node.allowedCountries)
          ? node.allowedCountries.filter(isString)
          : undefined;

      const use24Hour = nodeType === "formTime" && node.use24Hour === true ? true : undefined;

      // SAFETY: fieldType comes from INPUT_TYPE_TO_FIELD_TYPE under the truthy guard above, and
      // each conditional prop is only produced by the node type that maps to it, so the literal
      // always matches the corresponding PlateFormField member.
      elements.push({
        id: name,
        name,
        fieldType: INPUT_TYPE_TO_FIELD_TYPE[nodeType],
        label: labelText || undefined,
        placeholder: placeholder || undefined,
        required: isRequired,
        minLength,
        maxLength,
        defaultValue,
        ...(isFieldArray && { isFieldArray }),
        initialRows,
        ...fileUploadFields,
        ...numberFields,
        ...linearScaleFields,
        ...ratingFields,
        ...(verifyEmail && { verifyEmail }),
        ...(allowedCountries?.length && { allowedCountries }),
        ...(use24Hour && { use24Hour }),
      } as PlateFormField);
      fieldIndex++;
      i++;
      continue;
    }

    // Matrix — a single void node holding rows + columns on its props.
    if (nodeType === "formMatrix") {
      const label = lookBackForLabel(i);
      const labelText = label?.labelText ?? "";
      const labelNode = label?.labelNode ?? null;
      const isRequired = resolveRequired(node, labelNode);

      const rows = buildMatrixEntries(node, "row");
      const columns = buildMatrixEntries(node, "column");

      const stableId = readNodeId(label?.labelNode) ?? readNodeId(node);

      const baseName = slugify(labelText);
      const name = stableId || `${baseName}_${fieldIndex}`;

      elements.push({
        id: name,
        name,
        fieldType: "Matrix",
        label: labelText || undefined,
        required: isRequired,
        rows,
        columns,
        ...(node.multiple === true && { multiple: true }),
        ...(node.randomizeOrder === true && { shuffle: true }),
      });
      fieldIndex++;
      i++;
      continue;
    }

    // Compound field — collect consecutive option items
    if (nodeType === "formOptionItem") {
      const label = lookBackForLabel(i);
      const labelText = label?.labelText ?? "";
      const labelNode = label?.labelNode ?? null;
      const isRequired = resolveRequired(node, labelNode);

      const variant = readString(node, "variant") || "checkbox";

      const optionNodes: TElement[] = [];
      let j = i;

      while (j < value.length && value[j].type === "formOptionItem") {
        optionNodes.push(value[j]);
        j++;
      }

      const options = buildOptionList(optionNodes);

      const stableId = readNodeId(label?.labelNode) ?? readNodeId(node);

      const baseName = slugify(labelText);
      const name = stableId || `${baseName}_${fieldIndex}`;

      const fieldType = VARIANT_TO_FIELD_TYPE[variant] || "Checkbox";
      // Group flags live on the first option node: showAsDropdown (display mode), randomizeOrder
      // (Shuffle toggle), optionLabel (Labels submenu); Checkbox/MultiChoice read them.
      const isChoiceGroup = fieldType === "Checkbox" || fieldType === "MultiChoice";
      const showAsDropdown = isChoiceGroup && node.showAsDropdown === true;
      const showImage = isChoiceGroup && node.showImage === true;
      // Shuffle applies to every option-group kind, Ranking included.
      const shuffle = node.randomizeOrder === true;

      const optionLabel =
        isChoiceGroup && isOptionLabelStyle(node.optionLabel) ? node.optionLabel : undefined;

      // SAFETY: fieldType is a VARIANT_TO_FIELD_TYPE value (or the "Checkbox" fallback), and
      // the group flags belong only to the Checkbox/MultiChoice kinds isChoiceGroup gates, so
      // the literal always matches the corresponding PlateFormField member.
      elements.push({
        id: name,
        name,
        fieldType,
        label: labelText || undefined,
        required: isRequired,
        options,
        ...(shuffle && { shuffle }),
        ...(showAsDropdown && { showAsDropdown }),
        ...(showImage && { showImage }),
        ...(optionLabel && { optionLabel }),
      } as PlateFormField);
      fieldIndex++;
      i = j; // Advance past all consumed option nodes
      continue;
    }

    if (nodeType === "formButton") {
      const childText = extractTextContent(node.children);

      const btnText = readString(node, "label") || childText || readString(node, "buttonText");

      const btnRole = isButtonRole(node.buttonRole) ? node.buttonRole : "submit";
      const defaultText = btnRole === "next" ? "Next" : btnRole === "previous" ? "Back" : "Submit";
      const name = `button_${fieldIndex}`;
      elements.push({
        id: name,
        name,
        fieldType: "Button",
        buttonText: btnText || defaultText,
        buttonRole: btnRole,
      });
      fieldIndex++;
      i++;
      continue;
    }

    // Headings (h1-3) / text (p/blockquote): if next is a form input, skip static
    // render — the input consumes this as its label via lookBackForLabel.
    if (ALLOWED_LABEL_TYPES.has(nodeType) && nodeType !== "formLabel") {
      const nextNode = i + 1 < value.length ? value[i + 1] : null;
      const nextType = nextNode ? nextNode.type : "";

      if (FORM_INPUT_NODE_TYPES.has(nextType)) {
        // Will be consumed as a label by the next input — skip static rendering
        i++;
        continue;
      }

      // Render as static content
      const content = extractTextContent(node.children);

      if (nodeType === "h1" || nodeType === "h2" || nodeType === "h3") {
        if (content) {
          if (nodeType === "h1") {
            elements.push({
              id: `h1_${elements.length}`,
              name: `h1_${elements.length}`,
              fieldType: "H1",
              content,
              static: true,
            });
          } else if (nodeType === "h2") {
            elements.push({
              id: `h2_${elements.length}`,
              name: `h2_${elements.length}`,
              fieldType: "H2",
              content,
              static: true,
            });
          } else {
            elements.push({
              id: `h3_${elements.length}`,
              name: `h3_${elements.length}`,
              fieldType: "H3",
              content,
              static: true,
            });
          }
        }
      } else if (content) {
        // p or blockquote with content -> Description
        elements.push({
          id: `desc_${elements.length}`,
          name: `desc_${elements.length}`,
          fieldType: "FieldDescription",
          content,
          static: true,
        });
      } else {
        // Empty p or blockquote -> EmptyBlock
        elements.push({
          id: `empty_${elements.length}`,
          name: `empty_${elements.length}`,
          fieldType: "EmptyBlock",
          static: true,
        });
      }

      i++;
      continue;
    }

    // formLabel: skip if next is an input (consumed); else render nothing (bare label).
    if (nodeType === "formLabel") {
      const nextNode = i + 1 < value.length ? value[i + 1] : null;
      const nextType = nextNode ? nextNode.type : "";

      if (FORM_INPUT_NODE_TYPES.has(nextType)) {
        // Will be consumed as a label by the next input
        i++;
        continue;
      }

      // Standalone formLabel with no input — skip it (no static rendering for bare labels)
      i++;
      continue;
    }

    if (nodeType === "hr") {
      elements.push({
        id: `sep_${elements.length}`,
        name: `sep_${elements.length}`,
        fieldType: "Separator",
        static: true,
      });
      i++;
      continue;
    }

    if (nodeType === "pageBreak") {
      const isThankYouPage = Boolean(node.isThankYouPage);
      elements.push({
        id: `page_${elements.length}`,
        name: `page_${elements.length}`,
        fieldType: "PageBreak",
        isThankYouPage,
        static: true,
      });
      i++;
      continue;
    }

    if (nodeType === "ul") {
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

      i++;
      continue;
    }

    if (nodeType === "ol") {
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

      i++;
      continue;
    }

    if (nodeType === "toggle") {
      const children = node.children;
      let title = "";
      const contentNodes: TElement[] = [];

      if (children && children.length > 0) {
        const first = children[0];

        if (isElementNode(first) && first.children) {
          title = extractTextContent(first.children);
        } else if (isString(first.text)) {
          title = first.text;
        }

        for (const child of children.slice(1)) {
          if (isElementNode(child)) contentNodes.push(child);
        }
      }

      const toggleContent = transformPlateStateToFormElements(contentNodes);

      elements.push({
        id: `toggle_${elements.length}`,
        name: `toggle_${elements.length}`,
        fieldType: "Toggle",
        title: title || "Toggle",
        children: toggleContent,
        static: true,
      });
      i++;
      continue;
    }

    if (nodeType === "table") {
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

      i++;
      continue;
    }

    if (nodeType === "callout") {
      const content = extractTextContent(node.children);
      const emoji = readString(node, "emoji");
      elements.push({
        id: `callout_${elements.length}`,
        name: `callout_${elements.length}`,
        fieldType: "Callout",
        emoji,
        content: content || "",
        static: true,
      });
      i++;
      continue;
    }

    // Skip unsupported node types (and already-consumed indices)
    i++;
  }

  return elements;
};

export const getEditableFields = (elements: TransformedElement[]): PlateFormField[] =>
  elements.filter((el): el is PlateFormField => !("static" in el) || !el.static);
