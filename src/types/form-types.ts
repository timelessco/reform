// form-type.ts
import type { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import type { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import type { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { OTPInputProps } from "input-otp";
import type { Label } from "@/components/ui/label";

export type Option = { value: string; label: string };
//------------------------------------------------------------
type SharedFormProps = {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  static?: boolean;
};

type Input = {
  fieldType: "Input";
} & React.InputHTMLAttributes<HTMLInputElement> &
  SharedFormProps;

type PasswordInput = {
  fieldType: "Password";
  type: "password";
} & React.InputHTMLAttributes<HTMLInputElement> &
  SharedFormProps;

type OTPInput = {
  fieldType: "OTP";
} & Omit<OTPInputProps, "children"> & {
    children?: React.ReactNode;
  } & SharedFormProps;

type Textarea = {
  fieldType: "Textarea";
} & React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  SharedFormProps;

type Checkbox = {
  fieldType: "Checkbox";
} & CheckboxPrimitive.Root.Props &
  SharedFormProps;

type RadioGroup = {
  fieldType: "RadioGroup";
  options: Option[];
} & RadioGroupPrimitive.Props &
  SharedFormProps;
//------------------------------
type ToggleGroupBaseProps = {
  fieldType: "ToggleGroup";
  options: Option[];
};

type ToggleGroupSingle = ToggleGroupBaseProps &
  ToggleGroupPrimitive.Props & {
    type: "single";
  };

type ToggleGroupMultiple = ToggleGroupBaseProps &
  ToggleGroupPrimitive.Props & {
    type: "multiple";
  };

type ToggleGroup = (ToggleGroupSingle | ToggleGroupMultiple) & SharedFormProps;
//------------------------------

type Switch = {
  fieldType: "Switch";
} & SwitchPrimitive.Root.Props &
  SharedFormProps;

type Slider = {
  fieldType: "Slider";
} & SliderPrimitive.Root.Props &
  SharedFormProps;

type Select = {
  fieldType: "Select";
  /**
   * Options for the select field
   */
  options: Option[];
  placeholder: string;
} & React.SelectHTMLAttributes<HTMLSelectElement> &
  SharedFormProps;

type MultiSelect = {
  fieldType: "MultiSelect";
  /**
   * Options for the multiselect field
   */
  options: Option[];
  placeholder: string;
} & React.InputHTMLAttributes<HTMLInputElement> &
  SharedFormProps;
type DatePicker = {
  fieldType: "DatePicker";
} & React.InputHTMLAttributes<HTMLInputElement> &
  SharedFormProps;

type Heading = {
  fieldType: "H1" | "H2" | "H3";
  name: string;
  content: string;
  static: true;
} & React.HTMLAttributes<HTMLHeadingElement>;

type Divider = {
  fieldType: "Separator";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  static: true;
} & SeparatorPrimitive.Props;

type PageBreak = {
  fieldType: "PageBreak";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  /**
   * Whether this page break marks the thank you page
   */
  isThankYouPage: boolean;
  static: true;
};

type Description = {
  fieldType: "FieldDescription";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  static: true;
  content: string;
} & React.ComponentProps<"p">;

type Legend = {
  fieldType: "FieldLegend";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  static: true;
  content: string;
} & React.ComponentProps<typeof Label>;

/**
 * FormFieldType is a union type that represents all the possible form fields
 * that can be rendered in a form
 */
type FormFieldElement =
  | Textarea
  | Input
  | PasswordInput
  | OTPInput
  | Checkbox
  | RadioGroup
  | ToggleGroup
  | Switch
  | Select
  | MultiSelect
  | Slider
  | DatePicker;

/**
 * StaticFormElement is a type that represents a static form element
 * that is not editable by the user
 */
export type StaticFormElement = Heading | Divider | PageBreak | Description | Legend;

export type FormElement =
  | (FormFieldElement & { id: string })
  | (StaticFormElement & { id: string });

export type FormElementOrList = FormElement | FormElement[];

export type FormElementList = FormElement[] | FormElementOrList[];
export type FormElements = FormElementList | FormStep[] | FormArray[];
export type FormStep = {
  id: string;
  stepFields: FormElementList;
};

export type FormArrayEntry = {
  id: string;
  fields: FormElementList;
};

export type FormArray = {
  fieldType: "FormArray";
  id: string;
  name: string;
  label?: string;
  arrayField: FormElementList;
  entries: FormArrayEntry[];
};
//------------------------------------------------------------Form Element Handlers
/**
 * Address types for targeting elements in flat, nested, or multi-step layouts.
 */
export type FlatAddress = { fieldIndex: number };
export type NestedAddress = { fieldIndex: number; nestedIndex: number };
export type StepAddress = { stepIndex: number; fieldIndex: number };
export type StepNestedAddress = {
  stepIndex: number;
  fieldIndex: number;
  nestedIndex: number;
};
export type ElementAddress =
  | FlatAddress
  | NestedAddress
  | StepAddress
  | StepNestedAddress;

export type DropElement = (address: ElementAddress) => void;

export type EditElement = (
  address: ElementAddress,
  modifiedFormElement: FormElement,
) => void;

export type ReorderElements = (
  address: Pick<StepAddress, "stepIndex"> | Pick<FlatAddress, "fieldIndex">,
  newOrder: FormElementOrList[],
) => void;

export type AppendElement = (
  address: ElementAddress,
  fieldType: FormElement["fieldType"],
  overrides?: {
    id?: string;
    name?: string;
    content?: string;
    required?: boolean;
  },
) => void;

export type SetTemplate = (template: string) => void;

//------------------------------------------------------------Type Helpers
/** Extract a specific variant by fieldType */
export type ElementOfType<T extends FormElement["fieldType"]> = Extract<
  FormElement,
  { fieldType: T }
>;

/** All fieldType string literals */
export type FieldTypeLiteral = FormElement["fieldType"];

/** Type guard: is this element static? */
export function isStatic(
  el: FormElement,
): el is StaticFormElement & { id: string } {
  return "static" in el && (el as { static?: boolean }).static === true;
}

/** Type guard: narrow to specific fieldType */
export function isFieldType<T extends FieldTypeLiteral>(
  el: FormElement,
  type: T,
): el is ElementOfType<T> {
  return el.fieldType === type;
}

/** Type guard: is this an element with options? */
export function hasOptions(
  el: FormElement,
): el is FormElement & { options: Option[] } {
  return "options" in el && Array.isArray((el as unknown as { options?: unknown }).options);
}

//------------------------------------------------------------API Response Types
/**
 * Generic API response structure with data and error fields
 */
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

/**
 * Specific response type for draft operations
 */
export type CreateRegistryResponse = ApiResponse<{
  id: string;
}>;
