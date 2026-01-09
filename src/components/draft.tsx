import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldDescription, FieldLegend, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot
} from "@/components/ui/input-otp"
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useAppForm } from "@/components/ui/tanstack-form"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { draftFormSchema } from '@/lib/draftFormSchema'
import { cn } from "@/lib/utils"
import { revalidateLogic, useStore } from "@tanstack/react-form"
import { format } from "date-fns"
import { Calendar as CalendarIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

export function DraftForm() {

  const draftForm = useAppForm({
    defaultValues: {
      Checkbox_1767870049368: false,
      DatePicker_1767870050654: "",
      Input_1767870051559: "",
      OTP_1767870052479: "",
      Password_1767870053602: "",
      RadioGroup_1767870054549: "1",
      Select_1767870055399: "1",
      Slider_1767870056191: 1,
      Switch_1767870057066: false,
      Textarea_1767870057935: "",
      ToggleGroup_1767870059849: [] as string[]
    } as z.input<typeof draftFormSchema>,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: draftFormSchema, onDynamicAsyncDebounceMs: 500 },
    onSubmit: ({ value }) => {
      toast.success("success");
    },
    onSubmitInvalid({ formApi }) {
      const errorMap = formApi.state.errorMap['onDynamic']!;
      const inputs = Array.from(
        document.querySelectorAll("#previewForm input"),
      ) as HTMLInputElement[];

      let firstInput: HTMLInputElement | undefined;
      for (const input of inputs) {
        if (errorMap[input.name]) {
          firstInput = input;
          break;
        }
      }
      firstInput?.focus();
    }
  });
  const isDefault = useStore(draftForm.store, (state) => state.isDefaultValue);

  return (
    <div>
      <draftForm.AppForm>
        <draftForm.Form>
          <h1 className="text-3xl font-bold">Heading 1</h1>
          <h2 className="text-2xl font-bold">Heading 2</h2>
          <h3 className="text-xl font-bold">Heading 3</h3>
          <FieldDescription>Additional Details About Form</FieldDescription>
          <FieldLegend>Additional Heading</FieldLegend>
          <FieldSeparator />;
          <draftForm.AppField name={"Checkbox_1767870049368"}  >
            {(field) => (
              <field.FieldSet>
                <field.Field orientation="horizontal">
                  <Checkbox
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked as boolean)
                    }
                    disabled={false}
                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                  />
                  <field.FieldContent>
                    <field.FieldLabel
                      className="space-y-1 leading-none"
                      htmlFor={"Checkbox_1767870049368"}
                    >
                      Checkbox Label *
                    </field.FieldLabel>

                    <field.FieldError />
                  </field.FieldContent>
                </field.Field>
              </field.FieldSet>
            )}
          </draftForm.AppField>


          <draftForm.AppField name={"DatePicker_1767870050654"} >
            {(field) => {
              const date = field.state.value;
              return (
                <field.FieldSet className="flex flex-col w-full">
                  <field.Field>
                    <field.FieldLabel htmlFor={"DatePicker_1767870050654"}>Pick a date *</field.FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild disabled={false} aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-start font-normal",
                            !date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {date ? (
                            format(date as unknown as Date, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.state.value as unknown as Date | undefined}
                          onSelect={(newDate) => {
                            field.handleChange(newDate?.toISOString() as string);
                          }}
                          aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                        />
                      </PopoverContent>
                    </Popover>

                    <field.FieldError />
                  </field.Field>
                </field.FieldSet>
              );
            }}
          </draftForm.AppField>

          <draftForm.AppField name={"Input_1767870051559"}>
            {(field) => (
              <field.FieldSet className="w-full">
                <field.Field>
                  <field.FieldLabel htmlFor={"Input_1767870051559"}>Input Field *</field.FieldLabel>
                  <Input
                    name={"Input_1767870051559"}
                    placeholder="Enter your text"
                    type="text"

                    value={(field.state.value as string | undefined) ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                  />
                </field.Field>

                <field.FieldError />
              </field.FieldSet>
            )}
          </draftForm.AppField>


          <draftForm.AppField name={"OTP_1767870052479"} >
            {(field) => (
              <field.FieldSet className="w-full">
                <field.Field>
                  <field.FieldLabel htmlFor={"OTP_1767870052479"}>One-Time Password *</field.FieldLabel>
                  <InputOTP
                    maxLength={6}
                    name={"OTP_1767870052479"}
                    value={(field.state.value as string | undefined) ?? ""}
                    onChange={field.handleChange}
                    required={true}
                    disabled={false}
                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </field.Field>
                <field.FieldDescription>Please enter the one-time password sent to your phone.</field.FieldDescription>
                <field.FieldError />
              </field.FieldSet>
            )}
          </draftForm.AppField>


          <draftForm.AppField name={"Password_1767870053602"} >
            {(field) => (
              <field.FieldSet className="w-full">
                <field.FieldLabel htmlFor={"Password_1767870053602"}>
                  Password Field *
                </field.FieldLabel>
                <field.Field orientation="horizontal">
                  <field.InputGroup>
                    <field.InputGroupInput
                      id={"Password_1767870053602"}
                      name={"Password_1767870053602"}
                      placeholder="Enter your password"
                      type="password"
                      value={(field.state.value as string | undefined) ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    />
                    <field.InputGroupAddon align="inline-end">
                      <button
                        type="button"
                        className="cursor-pointer flex items-center justify-center p-1 hover:text-gray-100 rounded transition-colors"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.parentElement?.querySelector('input') as HTMLInputElement;
                          if (input) {
                            input.type = input.type === "password" ? "text" : "password";
                            const button = e.currentTarget;
                            button.setAttribute('data-show', input.type === "text" ? "true" : "false");
                          }
                        }}
                        data-show="false"
                      >
                        <EyeIcon className="size-3 data-[show=true]:hidden" />
                        <EyeOffIcon className="size-3 hidden data-[show=true]:block" />
                      </button>
                    </field.InputGroupAddon>
                  </field.InputGroup>
                </field.Field>

                <field.FieldError />
              </field.FieldSet>
            )}
          </draftForm.AppField>

          <draftForm.AppField name={"RadioGroup_1767870054549"} >
            {(field) => {
              const options = [{ label: "Option 1", value: "1" }, { label: "Option 2", value: "2" }, { label: "Option 3", value: "3" }]
              return (
                <field.FieldSet className="flex flex-col gap-2 w-full py-1">
                  <field.FieldLabel className="mt-0" htmlFor={"RadioGroup_1767870054549"}>
                    Pick one option *
                  </field.FieldLabel>

                  <field.Field>
                    <RadioGroup
                      onValueChange={field.handleChange}
                      name={"RadioGroup_1767870054549"}
                      value={(field.state.value as string | undefined) ?? ""}
                      disabled={false}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    >
                      {options.map(({ label, value }) => (
                        <div key={value} className="flex items-center gap-x-2">
                          <RadioGroupItem
                            value={value}
                            id={value}
                            required={true}
                          />
                          <Label htmlFor={value}>{label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )
            }}
          </draftForm.AppField>


          <draftForm.AppField name={"Select_1767870055399"} >
            {(field) => {
              const options = [{ label: "Option 1", value: "1" }, { label: "Option 2", value: "2" }]
              return (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel className="flex justify-between items-center" htmlFor={"Select_1767870055399"}>Select option *</field.FieldLabel>
                  </field.Field>
                  <Select
                    name={"Select_1767870055399"}
                    value={(field.state.value as string | undefined) ?? ""}
                    onValueChange={field.handleChange}
                    defaultValue={String(field?.state.value ?? "")}
                    disabled={false}
                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                  >
                    <field.Field>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder="Select item"
                        />
                      </SelectTrigger>
                    </field.Field>
                    <SelectContent>
                      {options.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <field.FieldError />
                </field.FieldSet>
              )
            }}
          </draftForm.AppField>


          <draftForm.AppField name={"Slider_1767870056191"} >
            {(field) => {
              const min = 1;
              const max = 100;
              const step = 5;
              const defaultSliderValue = min;
              const currentValue = field.state.value;
              const sliderValue = Array.isArray(currentValue)
                ? currentValue
                : [currentValue || defaultSliderValue];

              return (
                <field.FieldSet className="w-full">
                  <field.Field>
                    <field.FieldLabel className="flex justify-between items-center" htmlFor={"Slider_1767870056191"}>
                      Set Range *
                      <span className="text-sm text-muted-foreground">
                        {sliderValue[0] || min} / {max}
                      </span>
                    </field.FieldLabel>
                    <Slider
                      name={"Slider_1767870056191"}
                      min={min}
                      max={max}
                      disabled={false}
                      step={step}
                      value={sliderValue}
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                      onValueChange={(newValue) => {
                        field.handleChange(newValue[0]);
                        field.handleBlur();
                      }}
                    />
                  </field.Field>
                  <field.FieldDescription className="py-1">
                    Adjust the range by sliding.
                  </field.FieldDescription>
                  <field.FieldError />
                </field.FieldSet>
              );
            }}
          </draftForm.AppField>


          <draftForm.AppField name={"Switch_1767870057066"} >
            {(field) => (
              <field.FieldSet className="flex flex-col p-3 justify-center w-full border rounded">
                <field.Field orientation="horizontal">
                  <field.FieldContent>
                    <field.FieldLabel htmlFor={"Switch_1767870057066"}>
                      Toggle Switch
                    </field.FieldLabel>
                    <field.FieldDescription>Turn on or off.</field.FieldDescription>
                  </field.FieldContent>
                  <Switch
                    name={"Switch_1767870057066"}
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      field.handleBlur();
                    }}
                    disabled={false}
                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                  />
                </field.Field>
              </field.FieldSet>
            )}
          </draftForm.AppField>


          <draftForm.AppField name={"Textarea_1767870057935"} >
            {(field) => (
              <field.FieldSet className="w-full">
                <field.Field>
                  <field.FieldLabel htmlFor={"Textarea_1767870057935"}>Textarea *</field.FieldLabel>
                  <Textarea
                    placeholder="Enter your text"
                    required={true}
                    disabled={false}
                    value={(field.state.value as string | undefined) ?? ""}
                    name={"Textarea_1767870057935"}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="resize-none"
                    aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                  />
                  <field.FieldDescription>A multi-line text input field</field.FieldDescription>
                </field.Field>
                <field.FieldError />
              </field.FieldSet>
            )}
          </draftForm.AppField>

          <draftForm.AppField name={"ToggleGroup_1767870059849"} >
            {(field) => {
              const options = [{ label: "Mon", value: "monday" }, { label: "Tue", value: "tuesday" }, { label: "Wed", value: "wednesday" }, { label: "Thu", value: "thursday" }, { label: "Fri", value: "friday" }, { label: "Sat", value: "saturday" }, { label: "Sun", value: "sunday" }]
              return (
                <field.FieldSet className="flex flex-col gap-2 w-full py-1">
                  <field.Field>
                    <field.FieldLabel className="mt-0" htmlFor={"ToggleGroup_1767870059849"}>
                      Pick multiple days *
                    </field.FieldLabel>

                    <ToggleGroup
                      type="multiple"
                      variant="outline"
                      onValueChange={field.handleChange}
                      className="flex justify-start items-center w-full"
                      aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
                    >
                      {options.map(({ label, value }) => (
                        <ToggleGroupItem
                          name={"ToggleGroup_1767870059849"}
                          value={value}
                          key={value}
                          disabled={false}
                          className="flex items-center gap-x-2 px-1"
                        >
                          {label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>

                  </field.Field>

                  <field.FieldError />
                </field.FieldSet>
              )
            }}
          </draftForm.AppField>

          <div className="flex justify-end items-center w-full pt-3 gap-3">
            {!isDefault &&
              <draftForm.SubmitButton type="button" label="Reset" variant="outline" onClick={() => draftForm.reset()} className="rounded-lg" variant='outline' size="sm" />
            }
            <draftForm.SubmitButton label="Submit" />
          </div>
        </draftForm.Form>
      </draftForm.AppForm>
    </div>
  )
}