import * as z from "zod";

export const customizeFormSchema = z.object({
  theme: z.string().default("Custom"),
  font: z.string().default("Inter"),
  backgroundColor: z.string().default("#ff9966"), // Based on image
  buttonBackgroundColor: z.string().default("#000000"),
  buttonTextColor: z.string().default("#ffffff"),
  accentColor: z.string().default("#000000"),

  // Layout
  pageWidth: z.string().default("700px"),
  baseFontSize: z.string().default("16px"),
  logoWidth: z.string().default("100px"),
  logoHeight: z.string().default("100px"),
  logoCornerRadius: z.string().default("50px"),
  coverHeight: z.string().default("25%"),

  // Inputs
  inputWidth: z.string().default("320px"),
  inputHeight: z.string().default("36px"),
  inputBackgroundColor: z.string().default("#ffffff80"),
  inputPlaceholderColor: z.string().default("#a86543"),
  inputBorderColor: z.string().default("#080503"),
  inputBorderWidth: z.string().default("1px"),
  inputBorderRadius: z.string().default("8px"),
  inputMarginBottom: z.string().default("10px"),
  inputHorizontalPadding: z.string().default("10px"),

  // Buttons
  buttonWidth: z.string().default("auto"),
  buttonHeight: z.string().default("36px"),
  buttonAlignment: z.enum(["left", "center", "right"]).default("center"),
  buttonFontSize: z.string().default("16px"),
  buttonCornerRadius: z.string().default("8px"),
  // buttonBackground/TextColor are already defined at top, but image shows them again in Buttons section?
  // The image shows 'Background' and 'Text' in Buttons section.
  // The top section has 'Button background' and 'Button text'.
  // They correspond to the same thing likely, or the top one is global and bottom is specific override.
  // For now I will assume they are linked or just use separate fields if needed.
  // Let's use specific names for the bottom section to be safe.
  buttonsBackgroundColor: z.string().default("#000000"),
  buttonsTextColor: z.string().default("#ffffff"),
  buttonVerticalMargin: z.string().default("10px"),
  buttonHorizontalPadding: z.string().default("14px"),

  customCss: z.string().optional(),
});

export type CustomizeFormValues = z.infer<typeof customizeFormSchema>;
