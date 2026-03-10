/**
 * Generate Zod validation schema from PlateFormField definitions.
 *
 * This utility creates a Zod schema object from the validation properties
 * stored in the Plate editor nodes, enabling runtime form validation in preview mode.
 */
import { type ZodType, z } from "zod";
import type { PlateFormField } from "./transform-plate-to-form";

/**
 * Generates a Zod schema from an array of PlateFormField.
 *
 * @param fields - Array of form fields with validation properties
 * @returns Zod object schema for form validation
 */
export function generateZodSchemaFromFields(
  fields: PlateFormField[],
): z.ZodObject<Record<string, ZodType>> {
  const schemaShape: Record<string, ZodType> = {};

  for (const field of fields) {
    // Skip Button fields - they don't have validation
    if (field.fieldType === "Button") {
      continue;
    }

    let schema: z.ZodString = z.string();

    // Apply minLength constraint
    if (field.minLength !== undefined && field.minLength > 0) {
      schema = schema.min(
        field.minLength,
        `Minimum ${field.minLength} characters required`,
      );
    }

    // Apply maxLength constraint
    if (field.maxLength !== undefined && field.maxLength > 0) {
      schema = schema.max(
        field.maxLength,
        `Maximum ${field.maxLength} characters allowed`,
      );
    }

    // Required fields must have at least 1 character
    if (field.required) {
      // Only add min(1) if no minLength is set
      if (field.minLength === undefined) {
        schema = schema.min(1, "This field is required");
      }
      schemaShape[field.name] = schema;
    } else {
      // Optional fields
      schemaShape[field.name] = schema.optional();
    }
  }

  return z.object(schemaShape);
}

/**
 * Generates default form values from fields, using defaultValue if specified.
 *
 * @param fields - Array of form fields
 * @returns Object with field names as keys and default values
 */
export function generateDefaultValuesFromFields(
  fields: PlateFormField[],
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of fields) {
    // Skip Button fields - they don't have form values
    if (field.fieldType === "Button") {
      continue;
    }
    defaults[field.name] = field.defaultValue ?? "";
  }

  return defaults;
}
