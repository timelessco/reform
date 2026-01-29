import type { Value } from "platejs";
import type { FormElement, StaticFormElement } from "@/types/form-types";

export type PreviewElement = FormElement | StaticFormElement;

export type FormHeaderData = {
	title: string;
	icon: string | null;
	cover: string | null;
};

export function extractFormHeader(value: Value): FormHeaderData | null {
	if (value.length > 0 && value[0].type === "formHeader") {
		const node = value[0];
		return {
			title: (node.title as string) || "",
			icon: (node.icon as string | null) || null,
			cover: (node.cover as string | null) || null,
		};
	}
	return null;
}

export type PlateFormField =
	| {
			id: string;
			name: string;
			fieldType: "Input";
			label?: string;
			placeholder?: string;
			required?: boolean;
			minLength?: number;
			maxLength?: number;
			defaultValue?: string;
	  }
	| {
			id: string;
			name: string;
			fieldType: "Textarea";
			label?: string;
			placeholder?: string;
			required?: boolean;
			minLength?: number;
			maxLength?: number;
			defaultValue?: string;
	  }
	| {
			id: string;
			name: string;
			fieldType: "Button";
			buttonText?: string;
			buttonRole: "next" | "previous" | "submit";
	  };

export type PlateStaticElement =
	| { id: string; fieldType: "H1"; content: string; static: true; name: string }
	| { id: string; fieldType: "H2"; content: string; static: true; name: string }
	| { id: string; fieldType: "H3"; content: string; static: true; name: string }
	| { id: string; fieldType: "Separator"; static: true; name: string }
	| { id: string; fieldType: "EmptyBlock"; static: true; name: string }
	| {
			id: string;
			fieldType: "FieldDescription";
			content: string;
			static: true;
			name: string;
	  }
	| {
			id: string;
			fieldType: "PageBreak";
			isThankYouPage: boolean;
			static: true;
			name: string;
	  }
	| {
			id: string;
			fieldType: "UnorderedList";
			items: string[];
			static: true;
			name: string;
	  }
	| {
			id: string;
			fieldType: "OrderedList";
			items: string[];
			static: true;
			name: string;
	  }
	| {
			id: string;
			fieldType: "Toggle";
			title: string;
			children: TransformedElement[];
			static: true;
			name: string;
	  }
	| {
			id: string;
			fieldType: "Table";
			rows: { cells: string[]; isHeader: boolean }[];
			static: true;
			name: string;
	  }
	| {
			id: string;
			fieldType: "Callout";
			emoji?: string;
			content: string;
			static: true;
			name: string;
	  };

/**
 * Combined type for all preview elements
 */
export type TransformedElement = PlateFormField | PlateStaticElement;

/**
 * Extracts plain text content from a Plate node's children array.
 */
function extractTextContent(children: Array<{ text?: string }>): string {
	if (!Array.isArray(children)) return "";
	return children
		.map((child) => child.text || "")
		.join("")
		.trim();
}

/**
 * Generates a slugified name from a label string.
 * Example: "Email Address" -> "email_address"
 */
function slugify(str: string): string {
	return (
		str
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_|_$/g, "") || "field"
	);
}

/**
 * Extracts list items from a Plate list node (ul/ol).
 * Handles nested structure: ul > li > lic > text
 */
function extractListItems(node: any): string[] {
	const items: string[] = [];
	if (!node.children || !Array.isArray(node.children)) return items;

	for (const li of node.children) {
		if (li.type === "li" && li.children) {
			// List item content is typically in a "lic" (list item content) node
			for (const child of li.children) {
				if (child.type === "lic" || child.type === "p") {
					const text = extractTextContent(child.children);
					if (text) items.push(text);
				} else if (child.text !== undefined) {
					// Direct text child
					const text = child.text?.trim();
					if (text) items.push(text);
				}
			}
		}
	}
	return items;
}

/**
 * Extracts table rows from a Plate table node.
 * Handles structure: table > tr > (th|td) > text
 */
function extractTableRows(
	node: any,
): { cells: string[]; isHeader: boolean }[] {
	const rows: { cells: string[]; isHeader: boolean }[] = [];
	if (!node.children || !Array.isArray(node.children)) return rows;

	for (const tr of node.children) {
		if (tr.type === "tr" && tr.children) {
			const cells: string[] = [];
			let isHeader = false;

			for (const cell of tr.children) {
				if (cell.type === "th") {
					isHeader = true;
				}
				// Extract text from cell - cells often have p > text structure
				let cellText = "";
				if (cell.children) {
					for (const cellChild of cell.children) {
						if (cellChild.type === "p" && cellChild.children) {
							cellText += extractTextContent(cellChild.children);
						} else if (cellChild.text !== undefined) {
							cellText += cellChild.text;
						}
					}
				}
				cells.push(cellText.trim());
			}

			if (cells.length > 0) {
				rows.push({ cells, isHeader });
			}
		}
	}
	return rows;
}

/**
 * Transforms Plate.js editor Value into form elements suitable for preview.
 *
 * Supports:
 * - formLabel + formInput pairs -> Input fields
 * - formLabel + formTextarea pairs -> Textarea fields
 * - h1, h2, h3 -> Static headings
 * - hr -> Separator
 * - p, blockquote -> Description text
 *
 * @param value - Plate editor content array
 * @returns Array of elements for preview rendering
 */
export function transformPlateStateToFormElements(
	value: Value,
): TransformedElement[] {
	const elements: TransformedElement[] = [];
	let fieldIndex = 0;

	let i = 0;
	while (i < value.length) {
		const node = value[i];
		const nodeType = node.type as string;

		switch (nodeType) {
			case "formHeader":
				break;

			case "formLabel": {
				const labelText = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				const isRequired = Boolean(node.required);

				// Check if next node is a formInput or formTextarea
				const nextNode = value[i + 1];
				let placeholder = "";
				let minLength: number | undefined;
				let maxLength: number | undefined;
				let defaultValue: string | undefined;
				let fieldType: "Input" | "Textarea" = "Input";

				if (
					nextNode &&
					(nextNode.type === "formInput" || nextNode.type === "formTextarea")
				) {
					fieldType = nextNode.type === "formTextarea" ? "Textarea" : "Input";
					placeholder = (nextNode.placeholder as string) || "";
					// Get text from input if any for placeholder
					const inputText = extractTextContent(
						nextNode.children as Array<{ text?: string }>,
					);
					if (inputText && !placeholder) {
						placeholder = inputText;
					}
					// Extract validation properties from formInput/formTextarea node
					minLength = nextNode.minLength as number | undefined;
					maxLength = nextNode.maxLength as number | undefined;
					defaultValue = nextNode.defaultValue as string | undefined;

					i++; // Skip the formInput/formTextarea in the next iteration
				}

				const baseName = slugify(labelText);
				const name = `${baseName}_${fieldIndex}`;

				elements.push({
					id: name,
					name,
					fieldType,
					label: labelText || "Untitled Field",
					placeholder: placeholder || undefined,
					required: isRequired,
					minLength,
					maxLength,
					defaultValue,
				});
				fieldIndex++;
				break;
			}

			// Headings -> Static elements
			case "h1": {
				const content = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				if (content) {
					elements.push({
						id: `h1_${elements.length}`,
						name: `h1_${elements.length}`,
						fieldType: "H1",
						content,
						static: true,
					});
				}
				break;
			}

			case "h2": {
				const content = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				if (content) {
					elements.push({
						id: `h2_${elements.length}`,
						name: `h2_${elements.length}`,
						fieldType: "H2",
						content,
						static: true,
					});
				}
				break;
			}

			case "h3": {
				const content = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				if (content) {
					elements.push({
						id: `h3_${elements.length}`,
						name: `h3_${elements.length}`,
						fieldType: "H3",
						content,
						static: true,
					});
				}
				break;
			}

			// Horizontal rule -> Separator
			case "hr": {
				elements.push({
					id: `sep_${elements.length}`,
					name: `sep_${elements.length}`,
					fieldType: "Separator",
					static: true,
				});
				break;
			}

			// Page break -> PageBreak
			case "pageBreak": {
				const isThankYouPage = Boolean(node.isThankYouPage);
				elements.push({
					id: `page_${elements.length}`,
					name: `page_${elements.length}`,
					fieldType: "PageBreak",
					isThankYouPage,
					static: true,
				});
				break;
			}

			// Paragraphs/blockquotes -> Description or EmptyBlock
			case "p":
			case "blockquote": {
				const content = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				if (content) {
					// Non-empty paragraph -> Description
					elements.push({
						id: `desc_${elements.length}`,
						name: `desc_${elements.length}`,
						fieldType: "FieldDescription",
						content,
						static: true,
					});
				} else {
					// Empty paragraph -> EmptyBlock (for spacing)
					elements.push({
						id: `empty_${elements.length}`,
						name: `empty_${elements.length}`,
						fieldType: "EmptyBlock",
						static: true,
					});
				}
				break;
			}

			// Skip formInput/formTextarea if standalone (already handled with formLabel)
			case "formInput":
			case "formTextarea":
				break;

			// Button field
			case "formButton": {
				// Get button text from label property (new), children (old), or buttonText (legacy)
				const childText = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				const btnText = (node.label as string | undefined) || childText || (node.buttonText as string | undefined);
				const btnRole = (node.buttonRole as "next" | "previous" | "submit") || "submit";
				const defaultText = btnRole === "next" ? "Next" : btnRole === "previous" ? "Previous" : "Submit";
				const name = `button_${fieldIndex}`;
				elements.push({
					id: name,
					name,
					fieldType: "Button",
					buttonText: btnText || defaultText,
					buttonRole: btnRole,
				});
				fieldIndex++;
				break;
			}

			// Unordered list
			case "ul": {
				const items = extractListItems(node);
				if (items.length > 0) {
					elements.push({
						id: `ul_${elements.length}`,
						name: `ul_${elements.length}`,
						fieldType: "UnorderedList",
						items,
						static: true,
					});
				}
				break;
			}

			// Ordered list
			case "ol": {
				const items = extractListItems(node);
				if (items.length > 0) {
					elements.push({
						id: `ol_${elements.length}`,
						name: `ol_${elements.length}`,
						fieldType: "OrderedList",
						items,
						static: true,
					});
				}
				break;
			}

			// Toggle (collapsible)
			case "toggle": {
				// First child is typically the toggle title, rest is content
				const children = node.children as any[];
				let title = "";
				const contentNodes: any[] = [];

				if (children && children.length > 0) {
					// Extract title from first element
					if (children[0].children) {
						title = extractTextContent(children[0].children);
					} else if (children[0].text) {
						title = children[0].text;
					}
					// Rest are content
					contentNodes.push(...children.slice(1));
				}

				// Recursively transform toggle content
				const toggleContent = transformPlateStateToFormElements(contentNodes as Value);

				elements.push({
					id: `toggle_${elements.length}`,
					name: `toggle_${elements.length}`,
					fieldType: "Toggle",
					title: title || "Toggle",
					children: toggleContent,
					static: true,
				});
				break;
			}

			// Table
			case "table": {
				const rows = extractTableRows(node);
				if (rows.length > 0) {
					elements.push({
						id: `table_${elements.length}`,
						name: `table_${elements.length}`,
						fieldType: "Table",
						rows,
						static: true,
					});
				}
				break;
			}

			// Callout
			case "callout": {
				const content = extractTextContent(
					node.children as Array<{ text?: string }>,
				);
				const emoji = node.emoji as string | undefined;
				elements.push({
					id: `callout_${elements.length}`,
					name: `callout_${elements.length}`,
					fieldType: "Callout",
					emoji,
					content: content || "",
					static: true,
				});
				break;
			}

			default:
				// Skip unsupported node types
				break;
		}

		i++;
	}

	return elements;
}

/**
 * Filters only editable form fields (non-static elements)
 */
export function getEditableFields(
	elements: TransformedElement[],
): PlateFormField[] {
	return elements.filter(
		(el): el is PlateFormField => !("static" in el) || !el.static,
	);
}

/**
 * Generates default form values from a list of form fields.
 * Used to initialize TanStack Form with empty values.
 */
export function generateDefaultValues(
	elements: TransformedElement[],
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};

	for (const el of elements) {
		if (!("static" in el) || !el.static) {
			defaults[(el as PlateFormField).name] = "";
		}
	}

	return defaults;
}

/**
 * Result of splitting elements into steps
 */
export type StepSplitResult = {
	/** Array of steps, each containing elements for that step */
	steps: TransformedElement[][];
	/** Content to show after form submission (from thank you page break) */
	thankYouContent: TransformedElement[] | null;
};

/**
 * Splits transformed elements into steps based on PageBreak elements.
 * - Regular PageBreak = step divider
 * - PageBreak with isThankYouPage = marks content after it as thank you content
 *
 * @param elements - Array of transformed elements
 * @returns Object with steps array and optional thankYouContent
 */
export function splitElementsIntoSteps(
	elements: TransformedElement[],
): StepSplitResult {
	const steps: TransformedElement[][] = [];
	let currentStep: TransformedElement[] = [];
	let thankYouContent: TransformedElement[] | null = null;
	let isCollectingThankYou = false;

	for (const element of elements) {
		// Check if this is a PageBreak
		if ("static" in element && element.fieldType === "PageBreak") {
			// Save current step if it has content
			if (currentStep.length > 0) {
				steps.push(currentStep);
				currentStep = [];
			}

			// If this is a thank you page break, start collecting thank you content
			if (element.isThankYouPage) {
				isCollectingThankYou = true;
			}
			// Don't add the PageBreak element itself to any step
			continue;
		}

		// Add element to appropriate collection
		if (isCollectingThankYou) {
			if (!thankYouContent) {
				thankYouContent = [];
			}
			thankYouContent.push(element);
		} else {
			currentStep.push(element);
		}
	}

	// Don't forget the last step (if not collecting thank you content)
	if (currentStep.length > 0 && !isCollectingThankYou) {
		steps.push(currentStep);
	}

	// If no steps were created but we have content, it's a single step
	if (steps.length === 0 && currentStep.length > 0) {
		steps.push(currentStep);
	}

	return { steps, thankYouContent };
}
