import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { StyleNumberInput } from "@/components/ui/style-controls";
import { Switch } from "@/components/ui/switch";
import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { cn } from "@udecode/cn";

/** Common display config shared across all embed types */
export interface EmbedDisplayConfig {
  title: "visible" | "hidden";
  background: "transparent" | "solid";
  alignment: "center" | "left";
  dynamicHeight: boolean;
  dynamicWidth: boolean;
  trackEvents: boolean;
  branding: boolean;
}

/** Popup-specific appearance and behavior config */
export interface EmbedPopupConfig {
  overlay: "dark" | "light";
  hideOnSubmit: boolean;
  hideOnSubmitDelay: number;
  trigger: "button" | "auto" | "scroll";
  position: "bottom-right" | "bottom-left" | "center";
  width: number;
  emoji: boolean;
  emojiIcon: string;
  emojiAnimation: "wave" | "bounce" | "pulse";
}

/** Full embed options using typed config objects */
export interface EmbedOptions {
  height: number;
  display: EmbedDisplayConfig;
  popup: EmbedPopupConfig;
  customDomain: boolean;
}

/* ─── Flat field interface for TanStack Form bindings ─── */

/** Flat representation used by TanStack Form field bindings and URL search params */
export interface EmbedFormFields {
  height: number;
  dynamicHeight: boolean;
  dynamicWidth: boolean;
  hideTitle: boolean;
  alignLeft: boolean;
  transparentBackground: boolean;
  trackEvents: boolean;
  customDomain: boolean;
  branding: boolean;
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

export const defaultEmbedFormFields: EmbedFormFields = {
  height: 558,
  dynamicHeight: true,
  dynamicWidth: false,
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

/** Convert flat form fields to structured EmbedOptions */
export const formFieldsToEmbedOptions = (fields: EmbedFormFields): EmbedOptions => ({
  height: fields.height,
  display: {
    title: fields.hideTitle ? "hidden" : "visible",
    background: fields.transparentBackground ? "transparent" : "solid",
    alignment: fields.alignLeft ? "left" : "center",
    dynamicHeight: fields.dynamicHeight,
    dynamicWidth: fields.dynamicWidth,
    trackEvents: fields.trackEvents,
    branding: fields.branding,
  },
  popup: {
    overlay: fields.darkOverlay ? "dark" : "light",
    hideOnSubmit: fields.hideOnSubmit,
    hideOnSubmitDelay: fields.hideOnSubmitDelay,
    trigger: fields.popupTrigger,
    position: fields.popupPosition,
    width: fields.popupWidth,
    emoji: fields.emoji,
    emojiIcon: fields.emojiIcon,
    emojiAnimation: fields.emojiAnimation,
  },
  customDomain: fields.customDomain,
});

/** Minimal field API shape from TanStack Form render callbacks */
interface FieldRenderApi<T = unknown> {
  state: { value: T };
  handleChange: (value: T) => void;
}

interface EmbedConfigPanelProps {
  embedType: EmbedType;
  // eslint-disable-next-line typescript-eslint/no-explicit-any
  form: { Field: any; Subscribe: any };
  section: "customize" | "pro";
  /** Current server-side value of forms.branding for this form. When provided,
   * the Reform Branding toggle in the Pro section reads this value directly
   * instead of local form state, and writes back through `onBrandingChange`. */
  docBranding?: boolean;
  onBrandingChange?: (value: boolean) => void;
}

/* ─── Layout helpers matching Figma node 24119:5595 ─── */

export const ConfigCard = ({
  children,
  variant = "rounded",
}: {
  children: React.ReactNode;
  variant?: "rounded" | "square";
}) => (
  <div
    className={cn(
      "flex flex-col gap-px overflow-hidden",
      variant === "rounded" ? "rounded-lg" : "rounded-none",
    )}
  >
    {children}
  </div>
);

/**
 * Figma row:
 *   Select / value rows → pl-[10px] pr-[3px] py-[7px] gap-[6px]
 *   Switch rows          → pl-[10px] pr-[6px] py-[7px] gap-[6px]
 */
export const ConfigRow = ({
  label,
  description,
  children,
  variant = "default",
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  variant?: "default" | "switch";
}) => (
  <div
    className={`bg-secondary min-h-8.5 flex gap-3 items-center overflow-clip pl-2.5 py-1.75 ${
      // max-h-9.5
      variant === "switch" ? "pr-[6px]" : "pr-[3px]"
    }`}
  >
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <span className="text-base font-normal">{label}</span>
      {description && (
        <p className="text-sm font-normal text-wrap text-muted-foreground">{description}</p>
      )}
    </div>
    {children}
  </div>
);

/* ─── Select trigger class (shared) ─── */
/**
 * Figma button: h-[24px] px-[8px] py-[5.5px] rounded-[5px] gap-[4px]
 * Must override SelectTrigger defaults: data-[size=default]:h-8, py-2, pe-2, ps-2.5, rounded-lg
 * Use data-[size=default]:h-[24px] to match specificity of the default variant class.
 */
export const selectTriggerCls =
  "data-[size=default]:h-[24px] shrink-0 border-none bg-transparent shadow-none rounded-[5px] px-2 py-0 gap-1 w-auto text-[13px] text-foreground font-medium whitespace-nowrap ";

/* ─── Public entry point ─── */

export const EmbedConfigPanel = ({
  embedType,
  form,
  section,
  docBranding,
  onBrandingChange,
}: EmbedConfigPanelProps) => {
  if (section === "customize") {
    return <CustomizeSection embedType={embedType} form={form} />;
  }
  return <ProSection form={form} docBranding={docBranding} onBrandingChange={onBrandingChange} />;
};

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

const selectDynamicHeight = (s: { values: { dynamicHeight: boolean } }) => s.values.dynamicHeight;

/* ─── Sections ─── */

/* ─── Sections ─── */
const CustomizeSection = ({
  embedType,
  form,
}: {
  embedType: EmbedType;
  // eslint-disable-next-line typescript-eslint/no-explicit-any
  form: { Field: any; Subscribe: any };
}) => {
  if (embedType === "popup") {
    return (
      <ConfigCard>
        <form.Field name="popupTrigger">
          {(field: FieldRenderApi<string>) => (
            <ConfigRow label="Open popup">
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? field.state.value)}
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
        <form.Field name="popupPosition">
          {(field: FieldRenderApi<string>) => (
            <ConfigRow label="Popup Position">
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? field.state.value)}
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

        <form.Field name="popupWidth">
          {(field: FieldRenderApi<number>) => (
            <StyleNumberInput
              label="Popup Width"
              value={`${field.state.value}px`}
              onChange={(v) => {
                const num = parseInt(v);
                if (!isNaN(num)) field.handleChange(num);
              }}
              min={200}
              max={600}
              step={1}
              unit="px"
              className="!rounded-none !border-0 !bg-secondary !h-[34px]"
            />
          )}
        </form.Field>
        <form.Field name="hideOnSubmit">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Hide on submit" variant="switch">
              <Switch
                aria-label="Hide on submit"
                checked={field.state.value}
                onCheckedChange={(checked: boolean) => field.handleChange(checked)}
                size="default"
              />
            </ConfigRow>
          )}
        </form.Field>
        <form.Field name="darkOverlay">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Dark Overlay" variant="switch">
              <Switch
                aria-label="Dark Overlay"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
              />
            </ConfigRow>
          )}
        </form.Field>

        <form.Field name="emoji">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Show Emoji" variant="switch">
              <Switch
                aria-label="Show Emoji"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
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
        <form.Subscribe selector={selectDynamicHeight}>
          {(dynamicHeight: boolean) => (
            <form.Field name="height">
              {(field: FieldRenderApi<number>) => (
                <div className={dynamicHeight ? "opacity-40 pointer-events-none" : ""}>
                  <StyleNumberInput
                    label="Height"
                    value={`${field.state.value}px`}
                    onChange={(v) => {
                      const num = parseInt(v);
                      if (!isNaN(num)) field.handleChange(num);
                    }}
                    min={200}
                    max={1000}
                    step={1}
                    unit="px"
                    className="!rounded-none !border-0 !bg-secondary !h-[34px]"
                  />
                </div>
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="dynamicHeight">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Dynamic Height" variant="switch">
              <Switch
                aria-label="Dynamic Height"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
              />
            </ConfigRow>
          )}
        </form.Field>

        <form.Field name="dynamicWidth">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Dynamic Width" variant="switch">
              <Switch
                aria-label="Dynamic Width"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
              />
            </ConfigRow>
          )}
        </form.Field>

        <form.Field name="hideTitle">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Hide Title" variant="switch">
              <Switch
                aria-label="Hide Title"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
              />
            </ConfigRow>
          )}
        </form.Field>

        <form.Field name="alignLeft">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Align Left" variant="switch">
              <Switch
                aria-label="Align Left"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
              />
            </ConfigRow>
          )}
        </form.Field>

        <form.Field name="transparentBackground">
          {(field: FieldRenderApi<boolean>) => (
            <ConfigRow label="Transparency" variant="switch">
              <Switch
                aria-label="Transparency"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                size="default"
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
        {(field: FieldRenderApi<boolean>) => (
          <ConfigRow label="Transparent BG" variant="switch">
            <Switch
              aria-label="Transparent BG"
              checked={field.state.value}
              onCheckedChange={field.handleChange}
              size="default"
            />
          </ConfigRow>
        )}
      </form.Field>
    </ConfigCard>
  );
};

const ProSection = ({
  form,
  docBranding,
  onBrandingChange,
}: {
  // eslint-disable-next-line typescript-eslint/no-explicit-any
  form: { Field: any };
  docBranding?: boolean;
  onBrandingChange?: (value: boolean) => void;
}) => (
  <ConfigCard>
    <form.Field name="trackEvents">
      {(field: FieldRenderApi<boolean>) => (
        <ConfigRow label="Analytics" variant="switch">
          <Switch
            aria-label="Analytics"
            checked={field.state.value}
            onCheckedChange={field.handleChange}
            size="default"
          />
        </ConfigRow>
      )}
    </form.Field>

    {/* Reform Branding — server-controlled Pro feature. The switch stays
        bound to the local form field (so the URL and live editor preview
        update instantly), and when `onBrandingChange` is provided the change
        is also persisted to `forms.branding` so every embed reflects it. */}
    <form.Field name="branding">
      {(field: FieldRenderApi<boolean>) => (
        <ConfigRow label="Reform Branding" variant="switch">
          <Switch
            aria-label="Reform Branding"
            checked={docBranding ?? field.state.value}
            onCheckedChange={(value: boolean) => {
              field.handleChange(value);
              onBrandingChange?.(value);
            }}
            size="default"
          />
        </ConfigRow>
      )}
    </form.Field>

    <ConfigRow label="Custom Domain">
      <Select value="varman.co" disabled>
        <SelectTrigger className={`${selectTriggerCls} opacity-50`}>varman.co</SelectTrigger>
        <SelectContent>
          <SelectItem value="varman.co">varman.co</SelectItem>
        </SelectContent>
      </Select>
    </ConfigRow>
  </ConfigCard>
);
