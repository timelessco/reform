import { useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { EmbedType } from "@/hooks/use-editor-sidebar";

export interface EmbedOptions {
  height: number;
  dynamicHeight: boolean;
  hideTitle: boolean;
  alignLeft: boolean;
  transparentBackground: boolean;
  trackEvents: boolean;
  customDomain: boolean;
  branding: boolean;
  // Popup specific
  popupTrigger: "button" | "auto" | "scroll";
  popupPosition: "bottom-right" | "bottom-left" | "center";
  popupWidth: number;
  darkOverlay: boolean;
  emoji: boolean;
  emojiIcon: string;
  emojiAnimation: "wave" | "bounce" | "pulse";
  hideOnSubmit: boolean;
  hideOnSubmitDelay: number;
}

export const defaultEmbedOptions: EmbedOptions = {
  height: 558,
  dynamicHeight: true,
  hideTitle: false,
  alignLeft: false,
  transparentBackground: false,
  trackEvents: false,
  customDomain: false,
  branding: true,
  popupTrigger: "button",
  popupPosition: "bottom-right",
  popupWidth: 376,
  darkOverlay: false,
  emoji: true,
  emojiIcon: "\u{1F44B}",
  emojiAnimation: "wave",
  hideOnSubmit: false,
  hideOnSubmitDelay: 0,
};

interface EmbedConfigPanelProps {
  embedType: EmbedType;
  form: { Field: any; Subscribe: any };
  section: "customize" | "pro";
}

/* ─── Layout helpers matching Figma node 24119:5595 ─── */

function ConfigCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-px [&>:first-child]:rounded-t-[8px] [&>:last-child]:rounded-b-[8px]">
      {children}
    </div>
  );
}

/**
 * Figma row:
 *   Select / value rows → pl-[10px] pr-[3px] py-[7px] gap-[6px]
 *   Switch rows          → pl-[10px] pr-[6px] py-[7px] gap-[6px]
 */
function ConfigRow({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "switch";
}) {
  return (
    <div
      className={`bg-secondary flex gap-[6px] items-center overflow-clip pl-[10px] py-[7px] ${
        variant === "switch" ? "pr-[6px]" : "pr-[3px]"
      }`}
    >
      <span className="flex-1 min-w-0 text-sm leading-[1.15]">{label}</span>
      {children}
    </div>
  );
}

/** Drag-to-scrub + click-to-edit, styled as Figma value button: h-6 px-2 rounded-[5px] */
function ScrubValue({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "px",
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const startX = useRef(0);
  const startVal = useRef(0);
  const hasDragged = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = (v: number) =>
    Math.max(min, Math.min(max, Math.round(v / step) * step));

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startVal.current = value;
    hasDragged.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 3) hasDragged.current = true;
    if (hasDragged.current) {
      onChange(clamp(startVal.current + dx));
    }
  };

  const handlePointerUp = () => {
    if (!hasDragged.current && !editing) {
      setDraft(String(value));
      setEditing(true);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  const commit = () => {
    const num = parseInt(draft);
    if (!isNaN(num)) onChange(clamp(num));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-6 w-16 shrink-0 rounded-[5px] px-2 text-right text-[13px] font-medium bg-transparent outline-none tabular-nums"
      />
    );
  }

  return (
    <span
      className="h-6 shrink-0 inline-flex items-center rounded-[5px] px-2 text-[13px] font-medium whitespace-nowrap cursor-ew-resize select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {value}
      {unit}
    </span>
  );
}

/* ─── Select trigger class (shared) ─── */
/**
 * Figma button: h-[24px] px-[8px] py-[5.5px] rounded-[5px] gap-[4px]
 * Must override SelectTrigger defaults: data-[size=default]:h-8, py-2, pe-2, ps-2.5, rounded-lg
 * Use data-[size=default]:h-[24px] to match specificity of the default variant class.
 */
const selectTriggerCls =
  "data-[size=default]:h-[24px] shrink-0 border-none bg-transparent shadow-none rounded-[5px] px-2 py-0 gap-1 w-auto text-[13px] leading-[1.15] font-medium text-foreground whitespace-nowrap [&_svg]:size-3";

/* ─── Public entry point ─── */

export function EmbedConfigPanel({
  embedType,
  form,
  section,
}: EmbedConfigPanelProps) {
  if (section === "customize") {
    return <CustomizeSection embedType={embedType} form={form} />;
  }
  return <ProSection form={form} />;
}

/* ─── Label maps ─── */

const triggerLabels: Record<string, string> = {
  button: "On Button Click",
  auto: "Automatically",
  scroll: "After Scrolling",
};

const positionLabels: Record<string, string> = {
  "bottom-right": "Bottom Right",
  "bottom-left": "Bottom Left",
  center: "Center",
};

/* ─── Sections ─── */

function CustomizeSection({
  embedType,
  form,
}: {
  embedType: EmbedType;
  form: { Field: any };
}) {
  if (embedType === "popup") {
    return (
      <ConfigCard>
        {/* Open popup */}
        <form.Field name="popupTrigger">
          {(field: any) => (
            <ConfigRow label="Open popup">
              <Select
                value={field.state.value}
                onValueChange={(v: string) => field.handleChange(v)}
              >
                <SelectTrigger className={selectTriggerCls}>
                  {triggerLabels[field.state.value] ?? field.state.value}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button">On Button Click</SelectItem>
                  <SelectItem value="auto">Automatically</SelectItem>
                  <SelectItem value="scroll">After Scrolling</SelectItem>
                </SelectContent>
              </Select>
            </ConfigRow>
          )}
        </form.Field>

        {/* Hide on submit */}
        <form.Field name="hideOnSubmit">
          {(field: any) => (
            <ConfigRow label="Hide on submit">
              <Select
                value={field.state.value ? "yes" : "no"}
                onValueChange={(value: string | null) =>
                  field.handleChange(value === "yes")
                }
              >
                <SelectTrigger className={selectTriggerCls}>
                  {field.state.value ? "Yes" : "No"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </ConfigRow>
          )}
        </form.Field>

        {/* Popup Position */}
        <form.Field name="popupPosition">
          {(field: any) => (
            <ConfigRow label="Popup Position">
              <Select
                value={field.state.value}
                onValueChange={(v: string) => field.handleChange(v)}
              >
                <SelectTrigger className={selectTriggerCls}>
                  {positionLabels[field.state.value] ?? field.state.value}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
            </ConfigRow>
          )}
        </form.Field>

        {/* Popup Width */}
        <form.Field name="popupWidth">
          {(field: any) => (
            <ConfigRow label="Popup Width">
              <ScrubValue
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                min={200}
                max={600}
                unit="px"
              />
            </ConfigRow>
          )}
        </form.Field>

        {/* Dark Overlay */}
        <form.Field name="darkOverlay">
          {(field: any) => (
            <ConfigRow label="Dark Overlay" variant="switch">
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </ConfigRow>
          )}
        </form.Field>

        {/* Show Emoji */}
        <form.Field name="emoji">
          {(field: any) => (
            <ConfigRow label="Show Emoji" variant="switch">
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </ConfigRow>
          )}
        </form.Field>
      </ConfigCard>
    );
  }

  if (embedType === "standard") {
    return (
      <ConfigCard>
        {/* Height */}
        <form.Field name="height">
          {(field: any) => (
            <ConfigRow label="Height">
              <ScrubValue
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                min={200}
                max={1000}
                unit="px"
              />
            </ConfigRow>
          )}
        </form.Field>

        {/* Dynamic Height */}
        <form.Field name="dynamicHeight">
          {(field: any) => (
            <ConfigRow label="Dynamic Height" variant="switch">
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </ConfigRow>
          )}
        </form.Field>

        {/* Hide Title */}
        <form.Field name="hideTitle">
          {(field: any) => (
            <ConfigRow label="Hide Title" variant="switch">
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </ConfigRow>
          )}
        </form.Field>

        {/* Align Left */}
        <form.Field name="alignLeft">
          {(field: any) => (
            <ConfigRow label="Align Left" variant="switch">
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </ConfigRow>
          )}
        </form.Field>

        {/* Transparency */}
        <form.Field name="transparentBackground">
          {(field: any) => (
            <ConfigRow label="Transparency" variant="switch">
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </ConfigRow>
          )}
        </form.Field>
      </ConfigCard>
    );
  }

  // fullpage
  return (
    <ConfigCard>
      <form.Field name="transparentBackground">
        {(field: any) => (
          <ConfigRow label="Transparent BG" variant="switch">
            <Switch
              checked={field.state.value}
              onCheckedChange={(v) => field.handleChange(v)}
            />
          </ConfigRow>
        )}
      </form.Field>
    </ConfigCard>
  );
}

function ProSection({ form }: { form: { Field: any } }) {
  return (
    <ConfigCard>
      {/* Analytics */}
      <form.Field name="trackEvents">
        {(field: any) => (
          <ConfigRow label="Analytics" variant="switch">
            <Switch
              checked={field.state.value}
              onCheckedChange={(v) => field.handleChange(v)}
            />
          </ConfigRow>
        )}
      </form.Field>

      {/* Reform Branding */}
      <form.Field name="branding">
        {(field: any) => (
          <ConfigRow label="Reform Branding" variant="switch">
            <Switch
              checked={field.state.value}
              onCheckedChange={(v) => field.handleChange(v)}
            />
          </ConfigRow>
        )}
      </form.Field>

      {/* Custom Domain */}
      <ConfigRow label="Custom Domain">
        <Select value="varman.co" disabled>
          <SelectTrigger
            className={`${selectTriggerCls} opacity-50`}
          >
            varman.co
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="varman.co">varman.co</SelectItem>
          </SelectContent>
        </Select>
      </ConfigRow>
    </ConfigCard>
  );
}
