import { useCallback, useMemo } from "react";
import { InfoIcon, XIcon } from "@/components/ui/icons";
import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useForm, useLocalForm } from "@/hooks/use-live-hooks";
import { formCollection, localFormCollection } from "@/db-collections";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarSection } from "@/components/ui/sidebar-section";
import {
  ConfigCard,
  ConfigRow,
} from "@/components/form-builder/embed-config-panel";
import {
  StyleSelect,
  StyleColorPicker,
  StyleNumberInput,
} from "@/components/ui/style-controls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  STYLES,
  BASE_COLORS,
  DARK_BASE_COLORS,
  THEME_COLORS,
  FONT_MAP,
} from "@/lib/theme-presets";
import { TOKEN_NAMES } from "@/lib/generate-theme-css";

const FONT_OPTIONS = Object.keys(FONT_MAP);

const STYLE_OPTIONS: { label: string; value: string; description: string }[] = [
  {
    label: "Vega",
    value: "vega",
    description: "Classic shadcn/ui look. Clean and familiar.",
  },
  {
    label: "Nova",
    value: "nova",
    description: "Compact. Reduced spacing for efficient forms.",
  },
  {
    label: "Maia",
    value: "maia",
    description: "Soft and rounded. Generous spacing.",
  },
  {
    label: "Lyra",
    value: "lyra",
    description: "Sharp and boxy. Modern and precise.",
  },
  {
    label: "Mira",
    value: "mira",
    description: "Dense. Maximizes content per screen.",
  },
];

const THEME_COLOR_OPTIONS: {
  label: string;
  value: string;
  description: string;
}[] = [
  {
    label: "Zinc",
    value: "zinc",
    description: "Neutral gray. Understated and versatile.",
  },
  {
    label: "Rose",
    value: "rose",
    description: "Warm pink. Soft and inviting.",
  },
  {
    label: "Blue",
    value: "blue",
    description: "Classic blue. Professional and trustworthy.",
  },
  {
    label: "Green",
    value: "green",
    description: "Natural green. Fresh and reliable.",
  },
  {
    label: "Amber",
    value: "amber",
    description: "Warm amber. Friendly and approachable.",
  },
  {
    label: "Orange",
    value: "orange",
    description: "Bright orange. Energetic and bold.",
  },
  {
    label: "Violet",
    value: "violet",
    description: "Rich violet. Creative and elegant.",
  },
  {
    label: "Emerald",
    value: "emerald",
    description: "Deep emerald. Premium and lush.",
  },
  { label: "Cyan", value: "cyan", description: "Cool cyan. Modern and techy." },
  {
    label: "Indigo",
    value: "indigo",
    description: "Deep indigo. Focused and authoritative.",
  },
  {
    label: "Pink",
    value: "pink",
    description: "Vibrant pink. Playful and eye-catching.",
  },
  { label: "Red", value: "red", description: "Bold red. Urgent and powerful." },
];

const BASE_COLOR_OPTIONS: {
  label: string;
  value: string;
  description: string;
}[] = [
  {
    label: "Zinc",
    value: "zinc",
    description: "Pure neutral. Works with everything.",
  },
  {
    label: "Slate",
    value: "slate",
    description: "Cool undertone. Pairs with blues.",
  },
  {
    label: "Stone",
    value: "stone",
    description: "Warm undertone. Pairs with ambers.",
  },
  {
    label: "Gray",
    value: "gray",
    description: "Slightly cool. Versatile and clean.",
  },
  {
    label: "Neutral",
    value: "neutral",
    description: "True neutral. The most balanced.",
  },
];

const RADIUS_OPTIONS_WITH_DESC: {
  label: string;
  value: string;
  description: string;
}[] = [
  {
    label: "None",
    value: "none",
    description: "Sharp corners. Boxy and precise.",
  },
  {
    label: "Small",
    value: "small",
    description: "Subtle rounding. Clean and modern.",
  },
  {
    label: "Medium",
    value: "medium",
    description: "Standard rounding. Balanced look.",
  },
  {
    label: "Large",
    value: "large",
    description: "Generous rounding. Soft and friendly.",
  },
];

const CONFIG_INPUT_CLS = "!rounded-none !border-0 bg-secondary !h-[34px]";
const CONFIG_SELECT_CLS =
  "bg-secondary !rounded-none [&>button]:!rounded-none [&>button]:!border-0 [&>button]:bg-secondary [&>button]:!h-[34px]";

function ProBadge() {
  return (
    <div className="bg-teal-100 dark:bg-teal-700/20 text-teal-700 dark:text-teal-400 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
      Pro
    </div>
  );
}

interface CustomizeSidebarProps {
  formId: string;
  isLocal?: boolean;
}

export function CustomizeSidebar({ formId, isLocal }: CustomizeSidebarProps) {
  const { closeSidebar } = useEditorSidebar();
  const cloudForm = useForm(isLocal ? undefined : formId);
  const localFormResult = useLocalForm(isLocal ? formId : undefined);
  const formResult = isLocal ? localFormResult : cloudForm;
  const formDoc = formResult.data?.[0] ?? null;
  const collection = isLocal ? localFormCollection : formCollection;

  const customization = (formDoc?.customization ?? {}) as Record<
    string,
    string
  >;

  // Resolve the active style to get fallback values
  const resolvedStyle = useMemo(() => {
    const presetName = customization.preset || "vega";
    return STYLES[presetName] ?? STYLES.vega;
  }, [customization.preset]);

  const getValue = useCallback(
    (field: string) => {
      if (customization[field]) return customization[field];
      // Resolve from style for style-derived fields
      if (field === "radius") return resolvedStyle.radius;
      if (field === "spacing") return resolvedStyle.spacing;
      // Color/font defaults from active style preset
      if (field === "baseColor") return resolvedStyle.baseColor;
      if (field === "themeColor") return resolvedStyle.themeColor;
      if (field === "font") return resolvedStyle.font;
      return "";
    },
    [customization, resolvedStyle],
  );

  const updateField = useCallback(
    (field: string, value: string) => {
      if (formDoc?.id) {
        collection.update(formDoc.id, (draft) => {
          const current = (draft.customization ?? {}) as Record<string, string>;
          draft.customization = { ...current, [field]: value };
          draft.updatedAt = new Date().toISOString();
        });
      }
    },
    [formDoc?.id, collection],
  );

  const updateFields = useCallback(
    (fields: Record<string, string>) => {
      if (formDoc?.id) {
        collection.update(formDoc.id, (draft) => {
          const current = (draft.customization ?? {}) as Record<string, string>;
          draft.customization = { ...current, ...fields };
          draft.updatedAt = new Date().toISOString();
        });
      }
    },
    [formDoc?.id, collection],
  );

  const selectStyle = useCallback(
    (styleName: string) => {
      const style = STYLES[styleName];
      if (!style) return;

      const updates: Record<string, string> = {
        preset: styleName,
        radius: style.radius,
        spacing: style.spacing,
        baseColor: style.baseColor,
        themeColor: style.themeColor,
        font: style.font,
      };

      // Clear all color token overrides so preset base/theme colors take effect
      for (const tokenName of TOKEN_NAMES) {
        updates[tokenName] = "";
        updates[`light:${tokenName}`] = "";
        updates[`dark:${tokenName}`] = "";
      }

      updateFields(updates);
    },
    [updateFields],
  );

  const updateWithCustomPreset = useCallback(
    (field: string, value: string) => {
      updateFields({ [field]: value, preset: "custom" });
    },
    [updateFields],
  );

  const handleModeToggle = useCallback(
    (on: boolean) => {
      const targetMode = on ? "dark" : "light";
      const sourceMode = on ? "light" : "dark";
      const updates: Record<string, string> = { mode: targetMode };

      // One-time migration: move unprefixed overrides to source mode's prefix
      for (const tokenName of TOKEN_NAMES) {
        const unprefixed = customization[tokenName];
        if (unprefixed && !customization[`${sourceMode}:${tokenName}`]) {
          updates[`${sourceMode}:${tokenName}`] = unprefixed;
          updates[tokenName] = "";
        }
      }

      updateFields(updates);
    },
    [updateFields, customization],
  );

  const activePreset = customization.preset || "vega";
  const activeMode = customization.mode || "light";
  const activeBaseColors =
    activeMode === "dark" ? DARK_BASE_COLORS : BASE_COLORS;
  const activeThemeColor = getValue("themeColor");
  const activeBaseColor = getValue("baseColor");
  const activeFont = getValue("font");
  const activeRadius = getValue("radius");

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header — matches share sidebar */}
      <SidebarHeader className="pt-2 pb-1 pl-1 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground px-2.5">
            Customize
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      {/* Scrollable content */}
      <SidebarContent>
        <div className="p-2 space-y-3">
          {/* Dark Mode */}
          <ConfigCard>
            <ConfigRow label="Dark Mode" variant="switch">
              <Switch
                aria-label="Dark Mode"
                checked={activeMode === "dark"}
                onCheckedChange={handleModeToggle}
                size="small"
              />
            </ConfigRow>
          </ConfigCard>

          {/* Theme section */}
          <SidebarSection label="Theme" className="pb-2.75" action={<></>}>
            <ConfigCard>
              <StyleSelect
                label="Style"
                value={activePreset}
                onChange={(v) => selectStyle(v)}
                options={STYLE_OPTIONS}
                className={CONFIG_SELECT_CLS}
              />
              <StyleSelect
                label="Accent"
                value={activeThemeColor}
                onChange={(v) => {
                  updateFields({
                    themeColor: v,
                    preset: "custom",
                  });
                }}
                options={THEME_COLOR_OPTIONS.map((o) => ({
                  ...o,
                  swatchColor: THEME_COLORS[o.value]?.primary,
                }))}
                className={CONFIG_SELECT_CLS}
              />
              <StyleSelect
                label="Base"
                value={activeBaseColor}
                onChange={(v) => {
                  updateFields({
                    baseColor: v,
                    preset: "custom",
                  });
                }}
                options={BASE_COLOR_OPTIONS.map((o) => ({
                  ...o,
                  swatchColor: activeBaseColors[o.value]?.muted,
                }))}
                className={CONFIG_SELECT_CLS}
              />
              <StyleSelect
                label="Font"
                value={activeFont}
                onChange={(v) => updateWithCustomPreset("font", v)}
                options={FONT_OPTIONS.map((f) => ({ label: f, value: f }))}
                className={CONFIG_SELECT_CLS}
              />
              <StyleSelect
                label="Radius"
                value={activeRadius}
                onChange={(v) => updateWithCustomPreset("radius", v)}
                options={RADIUS_OPTIONS_WITH_DESC}
                className={CONFIG_SELECT_CLS}
              />
            </ConfigCard>
          </SidebarSection>

          {/* Advanced Banner */}
          <div className="shrink-0 overflow-hidden rounded-xl bg-free-plan-card-bg p-3 shadow-sm border border-border/40">
            <div className="flex items-center gap-2 mb-2 justify-between">
              <span className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider">
                Advanced
              </span>
              <ProBadge />
            </div>
            <p className="text-[12px] text-muted-foreground tracking-[0.13px] leading-[1.48] mb-3">
              Preview advanced customization. {APP_NAME} Pro is required to
              apply it to the published form.
            </p>
            <Button
              variant="outline"
              className="w-full h-7 text-[13px] font-medium text-sidebar-foreground bg-background border border-border hover:bg-muted rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
            >
              Upgrade to Pro
            </Button>
          </div>

          {/* Layout */}
          <SidebarSection label="Layout" action={<ProBadge />}>
            <ConfigCard>
              <StyleNumberInput
                label="Page Width"
                value={getValue("pageWidth") || "50%"}
                onChange={(v) => updateWithCustomPreset("pageWidth", v)}
                min={30}
                max={100}
                step={5}
                unit="%"
                className={CONFIG_INPUT_CLS}
              />
              <StyleNumberInput
                label="Cover Height"
                value={getValue("coverHeight") || "200px"}
                onChange={(v) => updateWithCustomPreset("coverHeight", v)}
                min={100}
                max={400}
                step={10}
                unit="px"
                displayUnit=""
                className={CONFIG_INPUT_CLS}
              />
              <StyleNumberInput
                label="Logo Width"
                value={getValue("logoWidth") || "100px"}
                onChange={(v) => updateWithCustomPreset("logoWidth", v)}
                min={40}
                max={200}
                step={4}
                unit="px"
                displayUnit=""
                className={CONFIG_INPUT_CLS}
              />
              <StyleNumberInput
                label="Input Width"
                value={getValue("inputWidth") || "60%"}
                onChange={(v) => updateWithCustomPreset("inputWidth", v)}
                min={20}
                max={100}
                step={5}
                unit="%"
                className={CONFIG_INPUT_CLS}
              />
            </ConfigCard>
          </SidebarSection>

          {/* Colors */}
          <SidebarSection label="Colors" action={<ProBadge />}>
            <ConfigCard>
              <AdvancedColorPickers
                customization={customization}
                updateField={updateWithCustomPreset}
              />
            </ConfigCard>
          </SidebarSection>

          {/* Typography */}
          <SidebarSection label="Typography" action={<ProBadge />}>
            <ConfigCard>
              <StyleNumberInput
                label="Font Size"
                value={getValue("baseFontSize") || "16px"}
                onChange={(v) => updateWithCustomPreset("baseFontSize", v)}
                min={12}
                max={24}
                step={1}
                unit="px"
                displayUnit=""
                className={CONFIG_INPUT_CLS}
              />
              <StyleNumberInput
                label="Letter Spacing"
                value={getValue("letterSpacing") || "0.02em"}
                onChange={(v) => updateWithCustomPreset("letterSpacing", v)}
                min={0}
                max={0.2}
                step={0.005}
                unit="em"
                displayUnit=""
                className={CONFIG_INPUT_CLS}
              />
            </ConfigCard>
          </SidebarSection>

          {/* Custom CSS */}
          <SidebarSection label="Custom CSS" action={<ProBadge />}>
            <div className="rounded-lg overflow-hidden border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <Textarea
                value={getValue("customCss")}
                onChange={(e) =>
                  updateWithCustomPreset("customCss", e.target.value)
                }
                className="font-mono text-[11px] h-32 bg-[#1e1e1e] text-[#d4d4d4] border-0 rounded-none focus-visible:ring-0 p-3 leading-relaxed"
                placeholder=".bf-themed { ... }"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-1.5 px-1 pt-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InfoIcon className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                  }
                />
                <TooltipContent
                  side="bottom"
                  className="max-w-[240px] text-[11px]"
                >
                  Supports shadcn tokens: --bf-primary, --bf-background,
                  --bf-foreground, etc.
                </TooltipContent>
              </Tooltip>
              <span className="text-[11px] text-muted-foreground/60">
                Use --bf-* tokens for overrides
              </span>
            </div>
          </SidebarSection>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// ── Advanced Color Pickers (extracted for readability) ──

const ADVANCED_COLOR_TOKENS = [
  { key: "primary", label: "Primary" },
  { key: "primary-foreground", label: "Primary FG" },
  { key: "secondary", label: "Secondary" },
  { key: "secondary-foreground", label: "Secondary FG" },
  { key: "accent", label: "Accent" },
  { key: "accent-foreground", label: "Accent FG" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "destructive", label: "Destructive" },
  { key: "destructive-foreground", label: "Destructive FG" },
  { key: "input", label: "Input" },
  { key: "border", label: "Border" },
  { key: "muted", label: "Muted" },
  { key: "muted-foreground", label: "Muted FG" },
  { key: "ring", label: "Ring" },
] as const;

function AdvancedColorPickers({
  customization,
  updateField,
}: {
  customization: Record<string, string>;
  updateField: (field: string, value: string) => void;
}) {
  // Resolve current base + theme to show fallback colors
  const baseColorName = customization.baseColor || "zinc";
  const themeColorName = customization.themeColor || "zinc";
  const isDark = customization.mode === "dark";
  const mode = isDark ? "dark" : "light";
  const baseColors = isDark ? DARK_BASE_COLORS : BASE_COLORS;
  const base = baseColors[baseColorName] ?? baseColors.zinc;
  const theme = THEME_COLORS[themeColorName] ?? THEME_COLORS.zinc;

  // Merged resolved tokens for fallback display
  const resolved: Record<string, string> = {
    ...base,
    ...theme,
    secondary: base.muted,
    "secondary-foreground": base["muted-foreground"],
    destructive: "#ef4444",
    "destructive-foreground": "#fafafa",
  };

  return (
    <>
      {ADVANCED_COLOR_TOKENS.map(({ key, label }) => {
        const prefixedKey = `${mode}:${key}`;
        const currentValue =
          customization[prefixedKey] ||
          customization[key] ||
          resolved[key] ||
          "#000000";

        return (
          <StyleColorPicker
            key={key}
            label={label}
            value={currentValue}
            onChange={(v) => updateField(prefixedKey, v)}
            className="!rounded-none !border-0 !bg-secondary !h-[34px]"
          />
        );
      })}
    </>
  );
}
