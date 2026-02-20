import { revalidateLogic } from "@tanstack/react-form";
import { X } from "lucide-react";
import type * as z from "zod";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/components/ui/tanstack-form";
import { Textarea } from "@/components/ui/textarea";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { customizeFormSchema } from "@/lib/customize-form-schema";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  StyleSelect,
  StyleColorPicker,
  StyleNumberInput,
  StyleAlignToggle,
} from "@/components/ui/style-controls";

export function CustomizeSidebar() {
  const { closeSidebar } = useEditorSidebar();

  const form = useAppForm({
    defaultValues: {
      theme: "Custom",
      font: "Inter",
      backgroundColor: "#ff9966",
      buttonBackgroundColor: "#000000",
      buttonTextColor: "#ffffff",
      accentColor: "#000000",
      pageWidth: "700px",
      baseFontSize: "16px",
      logoWidth: "100px",
      logoHeight: "100px",
      logoCornerRadius: "50px",
      coverHeight: "25%",
      inputWidth: "320px",
      inputHeight: "36px",
      inputBackgroundColor: "#ffffff80",
      inputPlaceholderColor: "#a86543",
      inputBorderColor: "#080503",
      inputBorderWidth: "1px",
      inputBorderRadius: "8px",
      inputMarginBottom: "10px",
      inputHorizontalPadding: "10px",
      buttonWidth: "auto",
      buttonHeight: "36px",
      buttonAlignment: "center",
      buttonFontSize: "16px",
      buttonCornerRadius: "8px",
      buttonsBackgroundColor: "#000000",
      buttonsTextColor: "#ffffff",
      buttonVerticalMargin: "10px",
      buttonHorizontalPadding: "14px",
      customCss: `/* \n.tally-block { ... \n*/`,
    } as z.input<typeof customizeFormSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: customizeFormSchema },
    onSubmit: async ({ value }) => { },
  });

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      <SidebarHeader className="px-4 h-[52px] border-b border-border/40 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-[0.13px] text-foreground/80">Customize</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => closeSidebar()} className="h-7 w-7 text-muted-foreground hover:bg-accent/50 rounded-lg transition-colors">
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </SidebarHeader>

      <SidebarContent className="p-0 overflow-y-auto custom-scrollbar">
        <form.AppForm>
          <form.Form className="p-4 space-y-6 pb-12">
            <Accordion type="multiple" defaultValue={["theme", "layout", "inputs", "buttons"]} className="w-full space-y-4">

              {/* Theme Section */}
              <AccordionItem value="theme" className="border-b-0">
                <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                  Theme
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1 pb-2">
                  <form.AppField name="theme">
                    {(field) => (
                      <StyleSelect
                        label="Theme"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                        options={[
                          { label: "Custom", value: "Custom" },
                          { label: "Light", value: "Light" },
                          { label: "Dark", value: "Dark" },
                        ]}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="font">
                    {(field) => (
                      <StyleSelect
                        label="Font"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                        options={[
                          { label: "Inter", value: "Inter" },
                          { label: "Roboto", value: "Roboto" },
                        ]}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="backgroundColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Background"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="accentColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Accent Color"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="buttonBackgroundColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Button bg"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="buttonTextColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Button text"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {/* Advanced Banner */}
            <div className="mx-3 mt-6 mb-2 shrink-0 overflow-hidden rounded-xl bg-free-plan-card-bg p-3 shadow-sm border border-border/40">
              <div className="flex items-center gap-2 mb-2 justify-between">
                <span className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider">
                  Advanced
                </span>
                <div className="bg-teal-100 dark:bg-teal-700/20 text-teal-700 dark:text-teal-400 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                  Pro
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground tracking-[0.13px] leading-[1.48] mb-3">
                Preview advanced customization. BetterForms Pro is required to apply it to the published form.
              </p>
              <Button
                variant="outline"
                className="w-full h-7 text-[13px] font-medium text-sidebar-foreground bg-background border border-border hover:bg-muted rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
              >
                Upgrade to Pro
              </Button>
            </div>

            <Accordion type="multiple" defaultValue={["layout", "inputs", "buttons"]}>

              {/* Layout Section */}
              <AccordionItem value="layout" className="border-b-0">
                <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                  Layout
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1 pb-2">
                  <form.AppField name="pageWidth">
                    {(field) => (
                      <StyleNumberInput
                        label="Page Width"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="baseFontSize">
                    {(field) => (
                      <StyleNumberInput
                        label="Base Font Size"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="logoWidth">
                    {(field) => (
                      <StyleNumberInput
                        label="Logo Width"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="logoHeight">
                    {(field) => (
                      <StyleNumberInput
                        label="Logo Height"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="logoCornerRadius">
                    {(field) => (
                      <StyleNumberInput
                        label="Logo Radius"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="coverHeight">
                    {(field) => (
                      <StyleNumberInput
                        label="Cover Height"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                </AccordionContent>
              </AccordionItem>

              {/* Inputs Section */}
              <AccordionItem value="inputs" className="border-b-0">
                <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                  Inputs
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1 pb-2">
                  <form.AppField name="inputWidth">
                    {(field) => (
                      <StyleNumberInput
                        label="Input Width"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputHeight">
                    {(field) => (
                      <StyleNumberInput
                        label="Input Height"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputBackgroundColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Background"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputPlaceholderColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Placeholder"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputBorderColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Border Color"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputBorderWidth">
                    {(field) => (
                      <StyleNumberInput
                        label="Border Width"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputBorderRadius">
                    {(field) => (
                      <StyleNumberInput
                        label="Border Radius"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputMarginBottom">
                    {(field) => (
                      <StyleNumberInput
                        label="Margin Bottom"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="inputHorizontalPadding">
                    {(field) => (
                      <StyleNumberInput
                        label="Horiz Padding"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                </AccordionContent>
              </AccordionItem>

              {/* Buttons Section */}
              <AccordionItem value="buttons" className="border-b-0">
                <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                  Buttons
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1 pb-2">
                  <form.AppField name="buttonWidth">
                    {(field) => (
                      <StyleNumberInput
                        label="Width"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonHeight">
                    {(field) => (
                      <StyleNumberInput
                        label="Height"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonAlignment">
                    {(field) => (
                      <StyleAlignToggle
                        label="Alignment"
                        value={(field.state.value as string) ?? ""}
                        onChange={(val) => field.handleChange(val as any)}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonFontSize">
                    {(field) => (
                      <StyleNumberInput
                        label="Font Size"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonCornerRadius">
                    {(field) => (
                      <StyleNumberInput
                        label="Corner Radius"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonsBackgroundColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Background"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonsTextColor">
                    {(field) => (
                      <StyleColorPicker
                        label="Text Color"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonVerticalMargin">
                    {(field) => (
                      <StyleNumberInput
                        label="Vertical Margin"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="buttonHorizontalPadding">
                    {(field) => (
                      <StyleNumberInput
                        label="Horiz Padding"
                        value={(field.state.value as string) ?? ""}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.AppField>
                </AccordionContent>
              </AccordionItem>

              {/* Custom CSS */}
              <AccordionItem value="css" className="border-b-0">
                <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                  <div className="flex items-center gap-2">
                    Custom CSS
                    <div className="bg-teal-100 text-teal-700 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                      Pro
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-2">
                  <form.AppField name="customCss">
                    {(field) => (
                      <div className="rounded-lg overflow-hidden border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <Textarea
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="font-mono text-[11px] h-32 bg-light-gray-950 text-[#d4d4d4] border-0 rounded-none focus-visible:ring-0 p-3 leading-relaxed"
                          placeholder=".class { ... }"
                          spellCheck={false}
                        />
                      </div>
                    )}
                  </form.AppField>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form.Form>
        </form.AppForm>
      </SidebarContent>
    </Sidebar>
  );
}
