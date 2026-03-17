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
  name: string;
  fieldType: "Input";
} & React.InputHTMLAttributes<HTMLInputElement> &
  SharedFormProps;

type PasswordInput = {
  name: string;
  fieldType: "Password";
  type: "password";
} & React.InputHTMLAttributes<HTMLInputElement> &
  SharedFormProps;

type OTPInput = {
  name: string;
  fieldType: "OTP";
} & Omit<OTPInputProps, "children"> & {
    children?: React.ReactNode;
  } & SharedFormProps;

type Textarea = {
  name: string;
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

type H1 = {
  fieldType: "H1";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  content: string;
  static: true;
} & React.HTMLAttributes<HTMLHeadingElement>;
type H2 = {
  fieldType: "H2";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  static: true;
  content: string;
} & React.HTMLAttributes<HTMLHeadingElement>;
type H3 = {
  fieldType: "H3";
  /**
   * the name is used as a key to identify the field
   */
  name: string;
  static: true;
  content: string;
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
export type StaticFormElement = H1 | H2 | H3 | Divider | PageBreak | Description | Legend;

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
 * DropElement is a function that is used to drop an element to the form elements array
 * USE CASES
 * - Element: i is required
 * - Nested Element: i, j is required
 * - Element in MS form: i, stepIndex is required
 * - Nested Element in MS form: i, j, stepIndex is required
 */
type DropElementOptions = {
  /**
   * Index where an element should be dropped to the form elements array
   */
  fieldIndex: number;
  /**
   * Index where a nested element should be dropped to the nested array
   */
  j?: number;
  /**
   * Whether the form is a multi-step form or not
   */
  isMS?: boolean;
  stepIndex?: number;
};
export type DropElement = (options: DropElementOptions) => void;

type EditElementOptions = {
  fieldIndex: number;
  modifiedFormElement: FormElement;
  j?: number;
  stepIndex?: number;
};
export type EditElement = (options: EditElementOptions) => void;

type ReorderParams = {
  newOrder: FormElementOrList[];
  fieldIndex?: number | null;
  stepIndex?: number | null;
};

export type ReorderElements = (params: ReorderParams) => void;

export type AppendElement = (options: {
  fieldType: FormElement["fieldType"];
  /**
   * index where a nested element should be appended to the main array
   */
  fieldIndex?: number | null;
  stepIndex?: number;
  j?: number;
  id?: string;
  name?: string;
  content?: string;
  required?: boolean;
}) => void;

export type SetTemplate = (template: string) => void;

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
