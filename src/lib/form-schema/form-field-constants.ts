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

// `required` is owned by the input node — that's what the editor's
// RequiredBadgeButton toggles and what `useFormInputNode` reads. The preview
// and validation must use the same source so the two stay in sync.
export const resolveRequired = (
  inputNode: Record<string, unknown>,
  _labelNode: Record<string, unknown> | null,
): boolean => Boolean(inputNode.required);

/** Map from formOptionItem variant to PlateFormField fieldType string */
export const VARIANT_TO_FIELD_TYPE: Record<string, string> = {
  checkbox: "Checkbox",
  multiChoice: "MultiChoice",
  multiSelect: "MultiSelect",
  ranking: "Ranking",
};
