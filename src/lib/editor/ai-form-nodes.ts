import type { TElement } from "platejs";

type FormBlockArgs = {
  fieldType: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

type FormSectionArgs = {
  title: string;
  level?: string | number;
};

const FIELD_TYPE_MAP = new Map<string, { nodeType: string; defaultPlaceholder?: string }>([
  ["input", { nodeType: "formInput", defaultPlaceholder: "Type Placeholder text" }],
  ["textarea", { nodeType: "formTextarea", defaultPlaceholder: "Type a placeholder" }],
  ["email", { nodeType: "formEmail", defaultPlaceholder: "email@example.com" }],
  ["phone", { nodeType: "formPhone", defaultPlaceholder: "+1 (555) 000-0000" }],
  ["number", { nodeType: "formNumber", defaultPlaceholder: "0" }],
  ["link", { nodeType: "formLink", defaultPlaceholder: "https://example.com" }],
  ["date", { nodeType: "formDate", defaultPlaceholder: "Select a date" }],
  ["time", { nodeType: "formTime", defaultPlaceholder: "Select a time" }],
  ["fileUpload", { nodeType: "formFileUpload" }],
]);

// Dropdown / multi-select are display modes of multiChoice / checkbox (showAsDropdown on the
// group's first option node), not variants.
const CHOICE_VARIANT_MAP = new Map<string, { variant: string; showAsDropdown?: boolean }>([
  ["checkbox", { variant: "checkbox" }],
  ["multiChoice", { variant: "multiChoice" }],
  ["ranking", { variant: "ranking" }],
  ["dropdown", { variant: "multiChoice", showAsDropdown: true }],
  ["multiSelect", { variant: "checkbox", showAsDropdown: true }],
]);

const buildLabelNode = (label: string, required: boolean): TElement => ({
  type: "formLabel",
  required,
  placeholder: "Type a question",
  children: [{ text: label }],
});

const buildStandardFieldNodes = (
  args: FormBlockArgs,
  nodeType: string,
  defaultPlaceholder?: string,
): TElement[] => {
  const label = buildLabelNode(args.label, args.required ?? false);

  // AI placeholder → editable text content; node's placeholder attr stays the default hint.
  const textContent = args.placeholder ?? "";

  const fieldNode: TElement = defaultPlaceholder
    ? { type: nodeType, placeholder: defaultPlaceholder, children: [{ text: textContent }] }
    : { type: nodeType, children: [{ text: textContent }] };

  return [label, fieldNode];
};

const buildChoiceFieldNodes = (
  args: FormBlockArgs,
  choice: { variant: string; showAsDropdown?: boolean },
): TElement[] => {
  const label = buildLabelNode(args.label, args.required ?? false);
  const options = args.options && args.options.length > 0 ? args.options : [""];

  const optionNodes = options.map((text, idx) => {
    const option: TElement = {
      type: "formOptionItem",
      variant: choice.variant,
      children: [{ text }],
    };

    // display flag lives on the group's first option node
    if (idx === 0 && choice.showAsDropdown) option.showAsDropdown = true;

    return option;
  });

  return [label, ...optionNodes, { type: "p", children: [{ text: "" }] }];
};

export const buildFormBlockNodes = (args: FormBlockArgs): TElement[] => {
  const { fieldType } = args;

  const standardField = FIELD_TYPE_MAP.get(fieldType);

  if (standardField) {
    return buildStandardFieldNodes(args, standardField.nodeType, standardField.defaultPlaceholder);
  }

  const choice = CHOICE_VARIANT_MAP.get(fieldType);

  if (choice) {
    return buildChoiceFieldNodes(args, choice);
  }

  // Fallback: treat unknown field types as input
  return buildStandardFieldNodes(args, "formInput", "Type Placeholder text");
};

export const buildFormSectionNodes = (args: FormSectionArgs): TElement[] => {
  const level = Number(args.level ?? 2);
  const type = `h${level >= 1 && level <= 3 ? level : 2}`;
  const section: TElement = { type, children: [{ text: args.title }] };

  return [section];
};
