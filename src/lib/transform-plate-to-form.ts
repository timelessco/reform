/**
 * Transform Plate.js editor state into form elements for preview rendering.
 * 
 * This utility converts the Plate node structure into a FormElement-compatible format
 * for use with preview components and TanStack Form.
 */
import type { Value } from 'platejs';
import type { FormElement, StaticFormElement } from '@/types/form-types';

/**
 * Extended type that includes both form fields and static elements
 */
export type PreviewElement = FormElement | StaticFormElement;

/**
 * Form input field (editable)
 */
export type PlateFormField = {
  id: string;
  name: string;
  fieldType: 'Input';
  label?: string;
  placeholder?: string;
  required?: boolean;
};

/**
 * Static elements (non-editable content)
 */
export type PlateStaticElement = 
  | { id: string; fieldType: 'H1'; content: string; static: true; name: string }
  | { id: string; fieldType: 'H2'; content: string; static: true; name: string }
  | { id: string; fieldType: 'H3'; content: string; static: true; name: string }
  | { id: string; fieldType: 'Separator'; static: true; name: string }
  | { id: string; fieldType: 'EmptyBlock'; static: true; name: string }
  | { id: string; fieldType: 'FieldDescription'; content: string; static: true; name: string };

/**
 * Combined type for all preview elements
 */
export type TransformedElement = PlateFormField | PlateStaticElement;

/**
 * Extracts plain text content from a Plate node's children array.
 */
function extractTextContent(children: Array<{ text?: string }>): string {
  if (!Array.isArray(children)) return '';
  return children
    .map((child) => child.text || '')
    .join('')
    .trim();
}

/**
 * Generates a slugified name from a label string.
 * Example: "Email Address" -> "email_address"
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'field';
}

/**
 * Transforms Plate.js editor Value into form elements suitable for preview.
 * 
 * Supports:
 * - formLabel + formInput pairs -> Input fields
 * - h1, h2, h3 -> Static headings
 * - hr -> Separator
 * - p, blockquote -> Description text
 * 
 * @param value - Plate editor content array
 * @returns Array of elements for preview rendering
 */
export function transformPlateStateToFormElements(value: Value): TransformedElement[] {
  const elements: TransformedElement[] = [];
  let fieldIndex = 0;
  
  let i = 0;
  while (i < value.length) {
    const node = value[i];
    const nodeType = node.type as string;
    
    switch (nodeType) {
      // Form input field (label + input pair)
      case 'formLabel': {
        const labelText = extractTextContent(node.children as Array<{ text?: string }>);
        const isRequired = Boolean(node.required);
        
        // Check if next node is a formInput
        const nextNode = value[i + 1];
        let placeholder = '';
        
        if (nextNode && nextNode.type === 'formInput') {
          placeholder = (nextNode.placeholder as string) || '';
          // Get text from input if any for placeholder
          const inputText = extractTextContent(nextNode.children as Array<{ text?: string }>);
          if (inputText && !placeholder) {
            placeholder = inputText;
          }
          i++; // Skip the formInput in the next iteration
        }
        
        const baseName = slugify(labelText);
        const name = `${baseName}_${fieldIndex}`;
        
        elements.push({
          id: name,
          name,
          fieldType: 'Input',
          label: labelText || 'Untitled Field',
          placeholder: placeholder || undefined,
          required: isRequired,
        });
        fieldIndex++;
        break;
      }
      
      // Headings -> Static elements
      case 'h1': {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          elements.push({
            id: `h1_${elements.length}`,
            name: `h1_${elements.length}`,
            fieldType: 'H1',
            content,
            static: true,
          });
        }
        break;
      }
      
      case 'h2': {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          elements.push({
            id: `h2_${elements.length}`,
            name: `h2_${elements.length}`,
            fieldType: 'H2',
            content,
            static: true,
          });
        }
        break;
      }
      
      case 'h3': {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          elements.push({
            id: `h3_${elements.length}`,
            name: `h3_${elements.length}`,
            fieldType: 'H3',
            content,
            static: true,
          });
        }
        break;
      }
      
      // Horizontal rule -> Separator
      case 'hr': {
        elements.push({
          id: `sep_${elements.length}`,
          name: `sep_${elements.length}`,
          fieldType: 'Separator',
          static: true,
        });
        break;
      }
      
      // Paragraphs/blockquotes -> Description or EmptyBlock
      case 'p':
      case 'blockquote': {
        const content = extractTextContent(node.children as Array<{ text?: string }>);
        if (content) {
          // Non-empty paragraph -> Description
          elements.push({
            id: `desc_${elements.length}`,
            name: `desc_${elements.length}`,
            fieldType: 'FieldDescription',
            content,
            static: true,
          });
        } else {
          // Empty paragraph -> EmptyBlock (for spacing)
          elements.push({
            id: `empty_${elements.length}`,
            name: `empty_${elements.length}`,
            fieldType: 'EmptyBlock',
            static: true,
          });
        }
        break;
      }
      
      // Skip formInput if standalone (already handled with formLabel)
      case 'formInput':
        break;
        
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
export function getEditableFields(elements: TransformedElement[]): PlateFormField[] {
  return elements.filter((el): el is PlateFormField => 
    !('static' in el) || !el.static
  );
}

/**
 * Generates default form values from a list of form fields.
 * Used to initialize TanStack Form with empty values.
 */
export function generateDefaultValues(elements: TransformedElement[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  
  for (const el of elements) {
    if (!('static' in el) || !el.static) {
      defaults[(el as PlateFormField).name] = '';
    }
  }
  
  return defaults;
}
