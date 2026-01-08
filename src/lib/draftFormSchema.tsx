import * as z from "zod"
  export const draftFormSchema = z.object({
Checkbox_1767870049368: z.boolean(),
DatePicker_1767870050654: z.string({error : 'This field is required'}),
Input_1767870051559: z.string().min(1, "This field is required"),
OTP_1767870052479: z.string().min(1, "This field is required"),
Password_1767870053602: z.string().min(1, "This field is required"),
RadioGroup_1767870054549: z.string().min(1, "This field is required"),
Select_1767870055399: z.string().min(1, "This field is required"),
Slider_1767870056191: z.number().min(1, "Must be at least 1").max(100, "Must be at most 100"),
Switch_1767870057066: z.boolean(),
Textarea_1767870057935: z.string().min(1, "This field is required"),
ToggleGroup_1767870059849: z.array(z.string().min(1, "This field is required"))
});