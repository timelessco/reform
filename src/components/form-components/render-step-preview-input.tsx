import { ChevronRightIcon } from "@/components/ui/icons";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AppForm } from "@/hooks/use-form-builder";
import type { TransformedElement } from "@/lib/transform-plate-to-form";

interface RenderStepPreviewInputProps {
  element: TransformedElement;
  form: AppForm;
}

/**
 * Extracts error message from Zod/TanStack Form error object
 */
function extractErrorMessage(error: unknown): string {
  if (!error) return "Invalid value";

  if (Array.isArray(error)) {
    return extractErrorMessage(error[0]);
  }

  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "Invalid value";
}

/**
 * Toggle renderer component with its own open/closed state
 */
function ToggleRenderer({
  title,
  items,
  form,
}: {
  title: string;
  items: TransformedElement[];
  form: AppForm;
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
        {items.map((child) => (
          <RenderStepPreviewInput key={child.id} element={child} form={form} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Renders a single element in the step form.
 * Handles static elements and form fields (Input, Textarea).
 * Buttons are handled separately in StepForm.
 */
export function RenderStepPreviewInput({ element, form }: RenderStepPreviewInputProps) {
  // Static elements
  if ("static" in element && element.static) {
    switch (element.fieldType) {
      case "H1":
        return <h1 className="text-3xl font-bold mt-6 mb-4">{element.content}</h1>;
      case "H2":
        return <h2 className="text-2xl font-semibold mt-5 mb-3">{element.content}</h2>;
      case "H3":
        return <h3 className="text-xl font-medium mt-4 mb-2">{element.content}</h3>;
      case "Separator":
        return <Separator className="my-4" />;
      case "EmptyBlock":
        return <div className="h-6" aria-hidden="true" />;
      case "FieldDescription":
        return <p className="text-muted-foreground text-sm my-2">{element.content}</p>;
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
        return <ToggleRenderer title={element.title} items={element.children} form={form} />;
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
                          <TableHead key={`${element.id}-header-${rowIdx}-${cellIdx}`}>
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
                        <TableCell key={`${element.id}-row-${rowIdx}-${cellIdx}`}>{cell}</TableCell>
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

  // Form field: Textarea
  if (element.fieldType === "Textarea") {
    // element is now narrowed to Textarea type
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";

          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 leading-none ml-2">
                    *
                  </span>
                )}
              </Label>
              <Textarea
                id={element.name}
                name={element.name}
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
                minLength={element.minLength}
                maxLength={element.maxLength}
                autoComplete="off"
                aria-invalid={hasErrors}
                className={cn(
                  "max-w-md min-h-24 rounded-lg border-0 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  // Form field: Input
  if (element.fieldType === "Input") {
    // element is now narrowed to Input type
    return (
      <form.AppField name={element.name}>
        {(f) => {
          const hasErrors = f.state.meta.errors.length > 0 && f.state.meta.isTouched;
          const errorMessage = hasErrors ? extractErrorMessage(f.state.meta.errors[0]) : "";

          return (
            <div className="space-y-2">
              <Label htmlFor={element.name}>
                {element.label}
                {element.required && (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-red-500 leading-none ml-2">
                    *
                  </span>
                )}
              </Label>
              <Input
                id={element.name}
                name={element.name}
                placeholder={element.placeholder}
                value={(f.state.value as string | undefined) ?? ""}
                onChange={(e) => f.handleChange(e.target.value)}
                onBlur={f.handleBlur}
                minLength={element.minLength}
                maxLength={element.maxLength}
                autoComplete="off"
                aria-invalid={hasErrors}
                className={cn(
                  "max-w-md rounded-lg border-0 bg-card pl-[10px] pr-[8px] shadow-form-input placeholder:text-muted-foreground/50",
                  hasErrors && "ring-destructive/20 ring-[3px]",
                )}
              />
              {hasErrors && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
          );
        }}
      </form.AppField>
    );
  }

  return null;
}
