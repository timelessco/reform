import type { Value } from "platejs";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRightIcon } from "lucide-react";
import { RenderPreviewInput } from "@/components/form-components/render-preview-input";
import { StepForm } from "@/components/form-components/step-form";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StepFormProvider, useStepForm } from "@/contexts/step-form-context";
import { usePreviewForm } from "@/hooks/use-preview-form";
import {
	extractFormHeader,
	type PlateFormField,
	splitElementsIntoSteps,
	type TransformedElement,
	transformPlateStateToFormElements,
} from "@/lib/transform-plate-to-form";

interface FormPreviewFromPlateProps {
	/** Plate editor content array */
	content: Value;
	/** Optional form title to display */
	title?: string;
	/** Optional icon emoji, URL, or 'default-icon' */
	icon?: string;
	/** Optional cover image URL or hex color code */
	cover?: string;
	/** Optional custom submit handler */
	onSubmit?: (values: Record<string, any>) => Promise<void>;
	/** Whether to hide the form title */
	hideTitle?: boolean;
}

/**
 * Checks if a string is likely an emoji (starts with emoji unicode range)
 */
function isEmoji(str: string): boolean {
	if (!str) return false;
	// Check if it's a short string that's likely an emoji
	const emojiRange =
		/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
	return str.length <= 4 && emojiRange.test(str);
}

/**
 * Checks if a string is a hex color code
 */
function isHexColor(str: string): boolean {
	return /^#([0-9A-Fa-f]{3}){1,2}$/.test(str);
}

/**
 * Checks if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
	if (!str) return false;
	try {
		new URL(str);
		return true;
	} catch {
		// Also check for relative paths starting with /
		return (
			str.startsWith("/") || str.startsWith("http") || str.startsWith("blob:")
		);
	}
}

/**
 * Default hexagon icon SVG (matches the editor's form-header.tsx)
 */
function DefaultIcon() {
	return (
		<div className="w-[80px] h-[80px] rounded-full overflow-hidden shadow-sm bg-black flex items-center justify-center text-white">
			<svg
				width="40"
				height="40"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
			</svg>
		</div>
	);
}

/**
 * Navigation handlers for buttons
 */
export type NavigationHandlers = {
	onNext?: () => void;
	onPrevious?: () => void;
	onSubmit?: () => void;
	isSubmitting?: boolean;
};

/**
 * Toggle renderer component with its own open/closed state
 */
function ToggleRenderer({
	title,
	children,
	form,
}: {
	title: string;
	children: TransformedElement[];
	form: ReturnType<typeof usePreviewForm>["form"];
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="my-2">
			<CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors">
				<ChevronRightIcon
					className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
				/>
				<span className="font-medium">{title}</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="pl-6 space-y-2">
				{children.map((child) => (
					<RenderPreviewElement key={child.id} element={child} form={form} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

/**
 * Renders a single preview element (static or input)
 */
function RenderPreviewElement({
	element,
	form,
	navigation,
	grouped = false,
}: {
	element: TransformedElement;
	form: ReturnType<typeof usePreviewForm>["form"];
	navigation?: NavigationHandlers;
	grouped?: boolean;
}) {
	// Static elements
	if ("static" in element && element.static) {
		switch (element.fieldType) {
			case "H1":
				return (
					<h1 className="text-3xl font-bold mt-6 mb-4">{element.content}</h1>
				);
			case "H2":
				return (
					<h2 className="text-2xl font-semibold mt-5 mb-3">
						{element.content}
					</h2>
				);
			case "H3":
				return (
					<h3 className="text-xl font-medium mt-4 mb-2">{element.content}</h3>
				);
			case "Separator":
				return <Separator className="my-4" />;
			case "EmptyBlock":
				return <div className="h-6" aria-hidden="true" />; // Empty spacer
			case "FieldDescription":
				return (
					<p className="text-muted-foreground text-sm my-2">
						{element.content}
					</p>
				);
			case "UnorderedList":
				return (
					<ul className="my-2 ml-6 space-y-1 list-disc">
						{element.items.map((item, idx) => (
							<li key={`${element.id}-${idx}`} className="text-sm pl-1">
								{item}
							</li>
						))}
					</ul>
				);
			case "OrderedList":
				return (
					<ol className="my-2 ml-6 space-y-1 list-decimal">
						{element.items.map((item, idx) => (
							<li key={`${element.id}-${idx}`} className="text-sm pl-1">
								{item}
							</li>
						))}
					</ol>
				);
			case "Toggle":
				return (
					<ToggleRenderer
						title={element.title}
						children={element.children}
						form={form}
					/>
				);
			case "Table":
				return (
					<div className="my-4 border rounded-md overflow-hidden">
						<Table>
							{element.rows.some((row) => row.isHeader) && (
								<TableHeader>
									{element.rows
										.filter((row) => row.isHeader)
										.map((row, rowIdx) => (
											<TableRow key={`${element.id}-header-${rowIdx}`}>
												{row.cells.map((cell, cellIdx) => (
													<TableHead
														key={`${element.id}-header-${rowIdx}-${cellIdx}`}
													>
														{cell}
													</TableHead>
												))}
											</TableRow>
										))}
								</TableHeader>
							)}
							<TableBody>
								{element.rows
									.filter((row) => !row.isHeader)
									.map((row, rowIdx) => (
										<TableRow key={`${element.id}-row-${rowIdx}`}>
											{row.cells.map((cell, cellIdx) => (
												<TableCell
													key={`${element.id}-row-${rowIdx}-${cellIdx}`}
												>
													{cell}
												</TableCell>
											))}
										</TableRow>
									))}
							</TableBody>
						</Table>
					</div>
				);
			case "Callout":
				return (
					<div className="my-4 bg-muted rounded-lg p-4 flex gap-3 items-start">
						{element.emoji && (
							<span className="text-xl shrink-0" role="img" aria-hidden="true">
								{element.emoji}
							</span>
						)}
						<p className="text-sm">{element.content}</p>
					</div>
				);
			default:
				return null;
		}
	}

	// Form fields (Input, Textarea, Button)
	if (
		element.fieldType === "Input" ||
		element.fieldType === "Textarea" ||
		element.fieldType === "Button"
	) {
		return (
			<RenderPreviewInput
				field={element as PlateFormField}
				form={form}
				navigation={navigation}
				grouped={grouped}
			/>
		);
	}

	return null;
}

/**
 * Form header component with proper icon and cover handling
 * Matches the editor's form-header.tsx rendering patterns
 */
function PreviewFormHeader({
	title,
	icon,
	cover,
	hideTitle,
}: {
	title?: string;
	icon?: string;
	cover?: string;
	hideTitle?: boolean;
}) {
	const [imageError, setImageError] = useState(false);
	const [iconError, setIconError] = useState(false);

	// Check if we have valid cover (URL or hex color)
	const hasCover =
		cover && (isHexColor(cover) || isValidUrl(cover)) && !imageError;
	const hasIcon = !!icon && !iconError;
	const hasTitle = title && title.trim().length > 0 && !hideTitle;

	if (!hasCover && !hasIcon && !hasTitle) {
		return null;
	}

	// Render cover - can be image or solid color
	const renderCover = () => {
		if (!cover) return null;

		if (isHexColor(cover)) {
			// Render as solid color background
			return (
				<div
					className="w-full h-[200px] sm:h-[300px]"
					style={{ backgroundColor: cover }}
				/>
			);
		}

		if (isValidUrl(cover) && !imageError) {
			// Render as image
			return (
				<div className="w-full h-[200px] sm:h-[300px] overflow-hidden bg-muted">
					<img
						src={cover}
						alt="Form cover"
						className="w-full h-full object-cover"
						onError={() => setImageError(true)}
					/>
				</div>
			);
		}

		return null;
	};

	// Render icon - can be default-icon, emoji, or image URL
	const renderIcon = () => {
		if (!icon) return null;

		// Handle 'default-icon' - render hexagon
		if (icon === "default-icon") {
			return (
				<div className={hasCover ? "-mt-[40px] relative z-10 px-3" : ""}>
					<DefaultIcon />
				</div>
			);
		}

		// Handle emoji
		if (isEmoji(icon)) {
			return (
				<div className={hasCover ? "-mt-[40px] relative z-10" : ""}>
					<span
						className="text-6xl sm:text-7xl block bg-background rounded-full leading-none p-2 w-fit h-fit"
						role="img"
						aria-label="Form icon"
					>
						{icon}
					</span>
				</div>
			);
		}

		// Handle image URL
		if (isValidUrl(icon) && !iconError) {
			return (
				<div className={hasCover ? "-mt-[40px] relative z-10" : ""}>
					<div className="w-[80px] h-[80px] rounded-full overflow-hidden shadow-sm bg-background p-1">
						<img
							src={icon}
							alt="Form icon"
							className="w-full h-full object-cover rounded-full"
							onError={() => setIconError(true)}
						/>
					</div>
				</div>
			);
		}

		return null;
	};

	return (
		<div className="mb-8 w-full">
			{hasCover && renderCover()}

			<div className="max-w-2xl mx-auto px-4 sm:px-0 relative">
				<div className="flex flex-col">
					{hasIcon && renderIcon()}
					{hasTitle && (
						<h1 className={`text-3xl font-bold px-3 ${hasIcon ? "mt-4" : "mt-8"}`}>
							{title}
						</h1>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Renders custom thank you content after form submission
 */
function RenderThankYouContent({
	elements,
	form,
	onReset,
}: {
	elements: TransformedElement[];
	form: ReturnType<typeof usePreviewForm>["form"];
	onReset?: () => void;
}) {
	return (
		<div className="space-y-4">
			{elements.map((element) => (
				<div key={element.id} className="w-full">
					<RenderPreviewElement element={element} form={form} />
				</div>
			))}
			{onReset && (
				<div className="flex justify-center pt-4">
					<Button
						type="button"
						onClick={onReset}
						variant="outline"
						size="sm"
						className="rounded-lg"
					>
						Submit another response
					</Button>
				</div>
			)}
		</div>
	);
}

/**
 * Default thank you message when no custom content is provided
 */
function DefaultThankYou({ onReset }: { onReset?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-green-600"
				>
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<h2 className="text-2xl font-bold mb-2">Thank you!</h2>
			<p className="text-muted-foreground mb-6">
				Your response has been submitted successfully.
			</p>
			{onReset && (
				<Button
					type="button"
					onClick={onReset}
					variant="outline"
					size="sm"
					className="rounded-lg"
				>
					Submit another response
				</Button>
			)}
		</div>
	);
}

/**
 * Renders Plate editor content as a functional form preview.
 * Supports multi-step forms with page breaks as step dividers.
 * Uses separate forms per step with StepFormContext for state management.
 */
export function FormPreviewFromPlate({
	content,
	title: legacyTitle,
	icon: legacyIcon,
	cover: legacyCover,
	onSubmit,
	hideTitle,
}: FormPreviewFromPlateProps) {
	const headerFromContent = extractFormHeader(content);

	const title = hideTitle ? "" : (headerFromContent?.title || legacyTitle);
	const icon = headerFromContent?.icon || legacyIcon;
	const cover = headerFromContent?.cover || legacyCover;

	const elements = transformPlateStateToFormElements(content);

	// Split elements into steps based on page breaks
	const { steps, thankYouContent } = splitElementsIntoSteps(elements);

	// Show placeholder if no elements found
	if (steps.length === 0 || steps.flat().length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
				<div className="text-muted-foreground mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mx-auto mb-4 opacity-50"
					>
						<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" x2="8" y1="13" y2="13" />
						<line x1="16" x2="8" y1="17" y2="17" />
						<line x1="10" x2="8" y1="9" y2="9" />
					</svg>
				</div>
				<h3 className="text-lg font-medium mb-2">No Content Yet</h3>
				<p className="text-sm text-muted-foreground max-w-md">
					Add content to the editor to see the preview.
				</p>
			</div>
		);
	}

	return (
		<StepFormProvider
			totalSteps={steps.length}
			thankYouContent={thankYouContent}
			onSubmit={onSubmit}
		>
			<FormPreviewContent
				steps={steps}
				thankYouContent={thankYouContent}
				title={title}
				icon={icon}
				cover={cover}
				hideTitle={hideTitle}
			/>
		</StepFormProvider>
	);
}

/**
 * Animation variants for form step transitions
 */
const stepVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 20 : -20,
		opacity: 0,
	}),
	center: {
		zIndex: 1,
		x: 0,
		opacity: 1,
	},
	exit: (direction: number) => ({
		zIndex: 0,
		x: direction < 0 ? 20 : -20,
		opacity: 0,
	}),
};

/**
 * Inner content component that uses StepFormContext
 */
function FormPreviewContent({
	steps,
	thankYouContent,
	title,
	icon,
	cover,
	hideTitle,
}: {
	steps: TransformedElement[][];
	thankYouContent: TransformedElement[] | null;
	title?: string;
	icon?: string;
	cover?: string;
	hideTitle?: boolean;
}) {
	const { currentStep, isSubmitted, direction, reset } = useStepForm();

	// Create a dummy form for thank you content rendering (static elements only)
	const { form } = usePreviewForm({ fields: [] });

	// Show thank you content after submission
	if (isSubmitted) {
		return (
			<div className="w-full">
				<PreviewFormHeader
					title={title}
					icon={icon}
					cover={cover}
					hideTitle={hideTitle}
				/>
				<div className="max-w-2xl mx-auto px-4 sm:px-0">
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
					>
						{thankYouContent && thankYouContent.length > 0 ? (
							<RenderThankYouContent
								elements={thankYouContent}
								form={form}
								onReset={reset}
							/>
						) : (
							<DefaultThankYou onReset={reset} />
						)}
					</motion.div>
				</div>
			</div>
		);
	}

	const isLastStep = currentStep === steps.length - 1;
	const currentStepElements = steps[currentStep] || [];

	return (
		<div className="w-full">
			{/* Header Section */}
			<PreviewFormHeader
				title={title}
				icon={icon}
				cover={cover}
				hideTitle={hideTitle}
			/>

			{/* Step Form */}
			<div className="max-w-2xl mx-auto px-4 overflow-hidden">
				<AnimatePresence mode="wait" custom={direction}>
					<motion.div
						key={currentStep}
						custom={direction}
						variants={stepVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{
							x: { type: "spring", stiffness: 300, damping: 30 },
							opacity: { duration: 0.2 },
						}}
						className="w-full"
					>
						<StepForm
							key={currentStep}
							stepIndex={currentStep}
							elements={currentStepElements}
							isLastStep={isLastStep}
						/>
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
