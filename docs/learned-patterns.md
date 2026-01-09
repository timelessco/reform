# Learned Patterns from Previous Form Builder Code

This document captures useful patterns from the original form-components codebase that can be reused in the Plate.js-based implementation.

---

## Implementation Status

### ✅ Already Adapted (Current Implementation)
| Pattern | Where Used | Notes |
|---------|-----------|-------|
| **Switch-Based Field Rendering** | `form-preview-from-plate.tsx` | Simplified for static elements + Input only |
| **Field Type Configuration** | `block-menu.tsx` | Toggle options for Required, Min/Max, Default |

### 🔮 Future Consideration
| Pattern | Priority | Use Case |
|---------|----------|----------|
| **Reorderable Options List** | High | When adding Select/RadioGroup field types |
| **Tabbed Settings Panel** | Medium | For advanced field settings in sidebar |
| **Dialog/Drawer Responsive** | Medium | Mobile-friendly field editing |
| **useListState Hook** | Medium | Multi-step form management |
| **Full Field Type Switch** | High | When supporting all 15+ field types |

---


**Source:** `render-form-element.tsx`

A comprehensive switch statement that handles 15+ field types with consistent structure:

```tsx
// Each field type follows this pattern:
case "Input":
  return (
    <form.AppField name={formElement.name}>
      {(field) => (
        <field.FieldSet className="w-full">
          <field.Field>
            <field.FieldLabel>
              {formElement.label}
              {formElement.required && <span className="text-red-500">*</span>}
            </field.FieldLabel>
            <Input
              value={(field.state.value as string) ?? ""}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={!!field.state.meta.errors.length && field.state.meta.isTouched}
            />
          </field.Field>
          <field.FieldDescription>{formElement.description}</field.FieldDescription>
          <field.FieldError />
        </field.FieldSet>
      )}
    </form.AppField>
  );
```

**Key field types to support:**
- Input, Password, Textarea
- Select, MultiSelect
- RadioGroup, Checkbox
- DatePicker, OTP
- Slider, Switch
- ToggleGroup

---

## 2. Tabbed Settings Panel Pattern

**Source:** `form-field-settings.tsx`

Three-tab structure for field configuration:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="validation">Validation</TabsTrigger>
    <TabsTrigger value="appearance">Appearance</TabsTrigger>
  </TabsList>
  
  <TabsContent value="general">
    {/* Label, Name, Options (for select/radio) */}
  </TabsContent>
  
  <TabsContent value="validation">
    {/* Required, Min/Max Length, Pattern */}
  </TabsContent>
  
  <TabsContent value="appearance">
    {/* Placeholder, Help Text, Width */}
  </TabsContent>
</Tabs>
```

---

## 3. Reorderable Options List Pattern

**Source:** `field-edit.tsx` - `OptionsList` component

Uses `motion/react` Reorder for drag-and-drop:

```tsx
import { Reorder } from "motion/react";

<Reorder.Group axis="y" onReorder={handleReorder} values={localOptions}>
  {localOptions.map((option, index) => (
    <Reorder.Item
      key={option.value}
      value={option}
      className="cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
      {editingIndex === index ? (
        // Edit mode with inline inputs
        <Input value={editingOption.label} />
      ) : (
        // Display mode with edit/delete buttons
        <span>{option.label}</span>
      )}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

---

## 4. Dialog/Drawer Responsive Pattern

**Source:** `field-edit.tsx` - `FieldCustomizationView` component

Mobile-first responsive editing:

```tsx
const isMobile = useIsMobile();

if (isMobile) {
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild><Button>Edit</Button></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
        {/* Form content */}
      </DrawerContent>
    </Drawer>
  );
}

return (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button>Edit</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      {/* Form content */}
    </DialogContent>
  </Dialog>
);
```

---

## 5. useListState Hook Pattern

**Source:** `field-edit.tsx`

Custom hook for array state management:

```tsx
const [localOptions, handlers] = useListState<Option>(options);

// Available handlers:
handlers.append(newItem);      // Add to end
handlers.remove(index);        // Remove at index
handlers.setItem(index, item); // Update at index
handlers.setState(newArray);   // Replace all
```

---

## 6. Field Type Configuration Objects

**Source:** `field-edit.tsx`

Predefined type options for dropdowns:

```tsx
const inputTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "url", label: "URL" },
  { value: "password", label: "Password" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone number" },
];
```

---

## 7. Static Field Detection Pattern

**Source:** `field-edit.tsx`

Helper function to check if field is static (non-editable):

```tsx
import { isStatic } from "@/utils/utils";

// Used to conditionally render different edit forms
if (isStatic(fieldType)) {
  // Render simple content editor
} else {
  // Render full field settings (label, name, options, etc.)
}
```

---

## 8. Form Element Type Structure

**Source:** `types.ts` (in form-components)

Type definitions for field configuration:

```typescript
interface Field {
  id: string;
  type: string;
  label: string;
  name: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  appearance?: {
    placeholder?: string;
    helpText?: string;
    width?: "auto" | "full" | "1/2" | "1/3";
  };
}

interface Option {
  id: string;
  label: string;
  value: string;
}

interface ChoiceField extends Field {
  options: Option[];
}
```

---

## Usage Notes

These patterns can be adapted for the Plate.js editor:
- Field settings can be exposed through the block menu popover
- The tabbed panel can be used in a sidebar for advanced settings
- Reorderable options are useful for select/radio field configuration
- Dialog/Drawer pattern works well for mobile editing
