import { revalidateLogic } from "@tanstack/react-form";
import { X, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type * as z from "zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCustomizeSidebar } from "@/hooks/use-customize-sidebar";
import { cn } from "@/lib/utils";
import { customizeFormSchema } from "@/lib/customize-form-schema";
import { useAppForm } from "@/components/ui/tanstack-form";
import { ColorPicker } from "@/components/ui/color-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";

export function CustomizeSidebar() {
	const { isOpen, setIsOpen } = useCustomizeSidebar();

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
		onSubmit: async ({ value }) => {
		},
	});



	return (
		<aside
			className={cn(
				"bg-background flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
				isOpen ? "w-[350px] border-l" : "w-0 border-l-0"
			)}
		>
			<div className="flex items-center justify-between p-4 border-b">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold tracking-tight">Customize</h2>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsOpen(false)}
					className="h-8 w-8"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto">
				<form.AppForm>
					<form.Form className="p-4 space-y-6">
						{/* Top Section: Theme & Colors */}
						<div className="space-y-4">
							<form.AppField name="theme">
								{(field) => (
									<div className="space-y-1.5">
										<Label htmlFor={field.name} className="text-xs text-muted-foreground">Theme</Label>
										<Select
											value={(field.state.value as string) ?? ""}
											onValueChange={field.handleChange}
										>
											<SelectTrigger className="h-9">
												<SelectValue placeholder="Select theme" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Custom">Custom</SelectItem>
												<SelectItem value="Light">Light</SelectItem>
												<SelectItem value="Dark">Dark</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</form.AppField>

							<form.AppField name="font">
								{(field) => (
									<div className="space-y-1.5">
										<Label htmlFor={field.name} className="text-xs text-muted-foreground">Font</Label>
										<Select
											value={(field.state.value as string) ?? ""}
											onValueChange={field.handleChange}
										>
											<SelectTrigger className="h-9">
												<SelectValue placeholder="Select font" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="Inter">Inter</SelectItem>
												<SelectItem value="Roboto">Roboto</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</form.AppField>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="backgroundColor">
									{(field) => (
										<ColorPicker
											label="Background"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
								<form.AppField name="accentColor">
									{(field) => (
										<ColorPicker
											label="Text"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="buttonBackgroundColor">
									{(field) => (
										<ColorPicker
											label="Button background"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
								<form.AppField name="buttonTextColor">
									{(field) => (
										<ColorPicker
											label="Button text"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
							</div>

							<form.AppField name="accentColor">
								{(field) => (
									<ColorPicker
										label="Accent (?)"
										value={(field.state.value as string) ?? ""}
										onChange={field.handleChange}
									/>
								)}
							</form.AppField>
						</div>

						<Separator />

						{/* Advanced Section */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-medium">Advanced</h3>
								<div className="bg-pink-100 text-pink-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Pro</div>
							</div>
							<div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800">
								You can preview advanced customization, but Tally Pro is
								required to apply it to the published form.{" "}
								<a href="#" className="underline font-semibold">Upgrade</a>
							</div>
						</div>

						<Separator />

						{/* Layout Section */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium">Layout</h3>
							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="pageWidth">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Page width</Label>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="baseFontSize">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Base font size</Label>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<form.AppField name="logoWidth">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-between items-center"><Label className="text-xs text-muted-foreground">Logo</Label> <span className="text-[10px] text-muted-foreground">Width</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="logoHeight">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-end"><span className="text-[10px] text-muted-foreground">Height</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="logoCornerRadius">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-end"><span className="text-[10px] text-muted-foreground">Corner radius</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="coverHeight">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-between items-center"><Label className="text-xs text-muted-foreground">Cover</Label> <span className="text-[10px] text-muted-foreground">Height</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>
						</div>

						<Separator />

						{/* Inputs Section */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium">Inputs</h3>
							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="inputWidth">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Width</Label>
											<div className="flex items-center gap-2">
												<AlignLeft className="w-4 h-4 text-muted-foreground" />
												<Input
													value={(field.state.value as string) ?? ""}
													onChange={(e) => field.handleChange(e.target.value)}
													className="h-8"
												/>
											</div>
										</div>
									)}
								</form.AppField>
								<form.AppField name="inputHeight">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Height</Label>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="inputBackgroundColor">
									{(field) => (
										<ColorPicker
											label="Background"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
								<form.AppField name="inputPlaceholderColor">
									{(field) => (
										<ColorPicker
											label="Placeholder"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<form.AppField name="inputBorderColor">
									{(field) => (
										<ColorPicker
											label="Border"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
								<form.AppField name="inputBorderWidth">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-end"><span className="text-[10px] text-muted-foreground">Width</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="inputBorderRadius">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-end"><span className="text-[10px] text-muted-foreground">Radius</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="inputMarginBottom">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Margin bottom</Label>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="inputHorizontalPadding">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Horizontal padding</Label>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>
						</div>

						<Separator />

						{/* Buttons Section */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium">Buttons</h3>
							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="buttonWidth">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Width</Label>
											<div className="flex items-center gap-2">
												<AlignLeft className="w-4 h-4 text-muted-foreground" />
												<Input
													value={(field.state.value as string) ?? ""}
													onChange={(e) => field.handleChange(e.target.value)}
													className="h-8"
												/>
											</div>
										</div>
									)}
								</form.AppField>
								<form.AppField name="buttonHeight">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Height</Label>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<form.AppField name="buttonAlignment">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Alignment</Label>
											<ToggleGroup type="single" value={(field.state.value as string) ?? ""} onValueChange={(val) => field.handleChange(val as any)} className="justify-start">
												<ToggleGroupItem value="left" className="h-8 w-8 p-0" aria-label="Left"><AlignLeft className="w-4 h-4" /></ToggleGroupItem>
												<ToggleGroupItem value="center" className="h-8 w-8 p-0" aria-label="Center"><AlignCenter className="w-4 h-4" /></ToggleGroupItem>
												<ToggleGroupItem value="right" className="h-8 w-8 p-0" aria-label="Right"><AlignRight className="w-4 h-4" /></ToggleGroupItem>
											</ToggleGroup>
										</div>
									)}
								</form.AppField>
								<form.AppField name="buttonFontSize">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-end"><span className="text-[10px] text-muted-foreground">Font size</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="buttonCornerRadius">
									{(field) => (
										<div className="space-y-1.5">
											<div className="flex justify-end"><span className="text-[10px] text-muted-foreground">Corner radius</span></div>
											<Input
												value={(field.state.value as string) ?? ""}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="buttonsBackgroundColor">
									{(field) => (
										<ColorPicker
											label="Background"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
								<form.AppField name="buttonsTextColor">
									{(field) => (
										<ColorPicker
											label="Text"
											value={(field.state.value as string) ?? ""}
											onChange={field.handleChange}
										/>
									)}
								</form.AppField>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="buttonVerticalMargin">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Vertical margin</Label>
											<Input
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
								<form.AppField name="buttonHorizontalPadding">
									{(field) => (
										<div className="space-y-1.5">
											<Label className="text-xs text-muted-foreground">Horizontal padding</Label>
											<Input
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												className="h-8"
											/>
										</div>
									)}
								</form.AppField>
							</div>
						</div>

						<Separator />

						{/* Custom CSS */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-medium">Custom CSS</h3>
								<div className="bg-pink-100 text-pink-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Pro</div>
							</div>
							<form.AppField name="customCss">
								{(field) => (
									<Textarea
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										className="font-mono text-xs h-32 bg-slate-900 text-slate-50"
										placeholder=".class { ... }"
									/>
								)}
							</form.AppField>
						</div>
					</form.Form>
				</form.AppForm>
			</div>
		</aside>
	);
}
