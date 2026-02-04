import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
}

export function ColorPicker({ value, onChange, label, id }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded border shadow-sm" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-8 font-mono text-xs uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}
