/** Node types that are form inputs (the actual field elements) */
export const FORM_INPUT_NODE_TYPES = new Set([
  "formInput",
  "formTextarea",
  "formEmail",
  "formPhone",
  "formNumber",
  "formLink",
  "formDate",
  "formTime",
  "formFileUpload",
  "formMultiSelectInput",
  "formOptionItem",
]);

/** Node types allowed as labels (preceding sibling of a form input) */
export const ALLOWED_LABEL_TYPES = new Set(["formLabel", "p", "h1", "h2", "h3", "blockquote"]);

/** Map from input node type to PlateFormField fieldType string */
export const INPUT_TYPE_TO_FIELD_TYPE: Record<string, string> = {
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

/**
 * Determine `required` from the input node, with fallback to the preceding
 * label node. Any node type accepted by `ALLOWED_LABEL_TYPES` (formLabel,
 * paragraph, headings, blockquote) can carry `required` — this keeps the
 * preview/published form consistent with the editor's required badge, which
 * is rendered for all of those block types.
 */
export const resolveRequired = (
  inputNode: Record<string, unknown>,
  labelNode: Record<string, unknown> | null,
): boolean => {
  if (inputNode.required != null) return Boolean(inputNode.required);
  if (labelNode && ALLOWED_LABEL_TYPES.has(labelNode.type as string)) {
    return Boolean(labelNode.required);
  }
  return false;
};

/** Map from formOptionItem variant to PlateFormField fieldType string */
export const VARIANT_TO_FIELD_TYPE: Record<string, string> = {
  checkbox: "Checkbox",
  multiChoice: "MultiChoice",
  multiSelect: "MultiSelect",
  ranking: "Ranking",
};
