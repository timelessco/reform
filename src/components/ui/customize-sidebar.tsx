import { useCallback, useMemo } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useFormSettings } from "@/hooks/use-live-hooks";
import { formSettingsCollection } from "@/db-collections";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  StyleSelect,
  StyleToggle,
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

const FONT_OPTIONS = Object.keys(FONT_MAP);

const STYLE_OPTIONS: { label: string; value: string; description: string }[] = [
  { label: "Vega", value: "vega", description: "Classic shadcn/ui look. Clean and familiar." },
  { label: "Nova", value: "nova", description: "Compact. Reduced spacing for efficient forms." },
  { label: "Maia", value: "maia", description: "Soft and rounded. Generous spacing." },
  { label: "Lyra", value: "lyra", description: "Sharp and boxy. Modern and precise." },
  { label: "Mira", value: "mira", description: "Dense. Maximizes content per screen." },
];

const THEME_COLOR_OPTIONS: { label: string; value: string; description: string }[] = [
  { label: "Zinc", value: "zinc", description: "Neutral gray. Understated and versatile." },
  { label: "Rose", value: "rose", description: "Warm pink. Soft and inviting." },
  { label: "Blue", value: "blue", description: "Classic blue. Professional and trustworthy." },
  { label: "Green", value: "green", description: "Natural green. Fresh and reliable." },
  { label: "Amber", value: "amber", description: "Warm amber. Friendly and approachable." },
  { label: "Orange", value: "orange", description: "Bright orange. Energetic and bold." },
  { label: "Violet", value: "violet", description: "Rich violet. Creative and elegant." },
  { label: "Emerald", value: "emerald", description: "Deep emerald. Premium and lush." },
  { label: "Cyan", value: "cyan", description: "Cool cyan. Modern and techy." },
  { label: "Indigo", value: "indigo", description: "Deep indigo. Focused and authoritative." },
  { label: "Pink", value: "pink", description: "Vibrant pink. Playful and eye-catching." },
  { label: "Red", value: "red", description: "Bold red. Urgent and powerful." },
];

const BASE_COLOR_OPTIONS: { label: string; value: string; description: string }[] = [
  { label: "Zinc", value: "zinc", description: "Pure neutral. Works with everything." },
  { label: "Slate", value: "slate", description: "Cool undertone. Pairs with blues." },
  { label: "Stone", value: "stone", description: "Warm undertone. Pairs with ambers." },
  { label: "Gray", value: "gray", description: "Slightly cool. Versatile and clean." },
  { label: "Neutral", value: "neutral", description: "True neutral. The most balanced." },
];

const RADIUS_OPTIONS_WITH_DESC: { label: string; value: string; description: string }[] = [
  { label: "None", value: "none", description: "Sharp corners. Boxy and precise." },
  { label: "Small", value: "small", description: "Subtle rounding. Clean and modern." },
  { label: "Medium", value: "medium", description: "Standard rounding. Balanced look." },
  { label: "Large", value: "large", description: "Generous rounding. Soft and friendly." },
];

interface CustomizeSidebarProps {
  formId: string;
}

export function CustomizeSidebar({ formId }: CustomizeSidebarProps) {
  const { closeSidebar } = useEditorSidebar();
  const { data: settings } = useFormSettings(formId);

  const customization = (settings?.customization ?? {}) as Record<string, string>;

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
      // Color/font defaults (not bundled in style)
      if (field === "baseColor") return "zinc";
      if (field === "themeColor") return "zinc";
      if (field === "font") return "Inter";
      return "";
    },
    [customization, resolvedStyle],
  );

  const updateField = useCallback(
    (field: string, value: string) => {
      if (!settings?.id) return;
      formSettingsCollection.update(settings.id, (draft) => {
        const current = (draft.customization ?? {}) as Record<string, string>;
        draft.customization = { ...current, [field]: value };
        draft.updatedAt = new Date().toISOString();
      });
    },
    [settings?.id],
  );

  const updateFields = useCallback(
    (fields: Record<string, string>) => {
      if (!settings?.id) return;
      formSettingsCollection.update(settings.id, (draft) => {
        const current = (draft.customization ?? {}) as Record<string, string>;
        draft.customization = { ...current, ...fields };
        draft.updatedAt = new Date().toISOString();
      });
    },
    [settings?.id],
  );

  const selectStyle = useCallback(
    (styleName: string) => {
      const style = STYLES[styleName];
      if (!style) return;
      updateFields({
        preset: styleName,
        radius: style.radius,
        spacing: style.spacing,
      });
    },
    [updateFields],
  );

  const updateWithCustomPreset = useCallback(
    (field: string, value: string) => {
      updateFields({ [field]: value, preset: "custom" });
    },
    [updateFields],
  );

  if (!settings) return null;

  const activePreset = customization.preset || "vega";
  const activeMode = customization.mode || "light";
  const activeBaseColors = activeMode === "dark" ? DARK_BASE_COLORS : BASE_COLORS;
  const activeThemeColor = getValue("themeColor");
  const activeBaseColor = getValue("baseColor");
  const activeFont = getValue("font");
  const activeRadius = getValue("radius");

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      <SidebarHeader className="px-4 h-[52px] border-b border-border/40 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-[0.13px] text-foreground/80">Customize</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => closeSidebar()} className="h-7 w-7 text-muted-foreground hover:bg-accent/50 rounded-lg transition-colors">
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </SidebarHeader>

      <SidebarContent className="p-0 overflow-y-auto custom-scrollbar">
        <div className="px-4 pt-3 pb-12">
          <Accordion type="single" collapsible defaultValue="theme" className="w-full space-y-0">

            {/* ── Theme ── */}
            <AccordionItem value="theme" className="border-b-0">
              <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                Theme
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-2">
                <StyleToggle
                  label="Dark Mode"
                  value={activeMode === "dark"}
                  onChange={(on) => updateField("mode", on ? "dark" : "light")}
                />
                <StyleSelect
                  label="Style"
                  value={activePreset}
                  onChange={(v) => selectStyle(v)}
                  options={STYLE_OPTIONS}
                />
                <StyleSelect
                  label="Accent"
                  value={activeThemeColor}
                  onChange={(v) => updateWithCustomPreset("themeColor", v)}
                  options={THEME_COLOR_OPTIONS.map((o) => ({
                    ...o,
                    swatchColor: THEME_COLORS[o.value]?.primary,
                  }))}
                />
                <StyleSelect
                  label="Base"
                  value={activeBaseColor}
                  onChange={(v) => updateWithCustomPreset("baseColor", v)}
                  options={BASE_COLOR_OPTIONS.map((o) => ({
                    ...o,
                    swatchColor: activeBaseColors[o.value]?.muted,
                  }))}
                />
                <StyleSelect
                  label="Font"
                  value={activeFont}
                  onChange={(v) => updateWithCustomPreset("font", v)}
                  options={FONT_OPTIONS.map((f) => ({ label: f, value: f }))}
                />
                <StyleSelect
                  label="Radius"
                  value={activeRadius}
                  onChange={(v) => updateWithCustomPreset("radius", v)}
                  options={RADIUS_OPTIONS_WITH_DESC}
                />
              </AccordionContent>
            </AccordionItem>

            {/* ── Advanced Banner ── */}
            <div className="mx-0 mt-4 mb-2 shrink-0 overflow-hidden rounded-xl bg-free-plan-card-bg p-3 shadow-sm border border-border/40">
              <div className="flex items-center gap-2 mb-2 justify-between">
                <span className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider">
                  Advanced
                </span>
                <div className="bg-teal-100 dark:bg-teal-700/20 text-teal-700 dark:text-teal-400 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                  Pro
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground tracking-[0.13px] leading-[1.48] mb-3">
                Preview advanced customization. BetterForms Pro is required to apply it to the published form.
              </p>
              <Button
                variant="outline"
                className="w-full h-7 text-[13px] font-medium text-sidebar-foreground bg-background border border-border hover:bg-muted rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
              >
                Upgrade to Pro
              </Button>
            </div>

            {/* Layout */}
            <AccordionItem value="layout" className="border-b-0">
              <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                <div className="flex items-center gap-2">
                  Layout
                  <div className="bg-teal-100 text-teal-700 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                    Pro
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-2">
                <StyleNumberInput label="Page Width" value={getValue("pageWidth") || "50%"} onChange={(v) => updateField("pageWidth", v)} min={30} max={100} step={5} unit="%" />
                <StyleNumberInput label="Cover Height" value={getValue("coverHeight") || "200px"} onChange={(v) => updateField("coverHeight", v)} min={100} max={400} step={10} unit="px" />
                <StyleNumberInput label="Logo Width" value={getValue("logoWidth") || "100px"} onChange={(v) => updateField("logoWidth", v)} min={40} max={200} step={4} unit="px" />
                <StyleNumberInput label="Input Width" value={getValue("inputWidth") || "320px"} onChange={(v) => updateField("inputWidth", v)} min={200} max={600} step={10} unit="px" />
              </AccordionContent>
            </AccordionItem>

            {/* Colors */}
            <AccordionItem value="colors" className="border-b-0">
              <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                <div className="flex items-center gap-2">
                  Colors
                  <div className="bg-teal-100 text-teal-700 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                    Pro
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-2">
                <AdvancedColorPickers customization={customization} updateField={updateField} />
              </AccordionContent>
            </AccordionItem>

            {/* Typography */}
            <AccordionItem value="typography" className="border-b-0">
              <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                <div className="flex items-center gap-2">
                  Typography
                  <div className="bg-teal-100 text-teal-700 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                    Pro
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-2">
                <StyleNumberInput label="Font Size" value={getValue("baseFontSize") || "16px"} onChange={(v) => updateField("baseFontSize", v)} min={12} max={24} step={1} unit="px" />
                <StyleNumberInput label="Letter Spacing" value={getValue("letterSpacing") || "0.02em"} onChange={(v) => updateField("letterSpacing", v)} min={0} max={0.2} step={0.005} unit="em" />
              </AccordionContent>
            </AccordionItem>

            {/* Custom CSS */}
            <AccordionItem value="css" className="border-b-0">
              <AccordionTrigger className="text-[12px] font-[650] text-muted-foreground uppercase tracking-wider py-2 hover:no-underline px-1">
                <div className="flex items-center gap-2">
                  Custom CSS
                  <div className="bg-teal-100 text-teal-700 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
                    Pro
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-2">
                <div className="rounded-lg overflow-hidden border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <Textarea
                    value={getValue("customCss")}
                    onChange={(e) => updateField("customCss", e.target.value)}
                    className="font-mono text-[11px] h-32 bg-light-gray-950 text-[#d4d4d4] border-0 rounded-none focus-visible:ring-0 p-3 leading-relaxed"
                    placeholder=".bf-themed { ... }"
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px] text-[11px]">
                      Supports shadcn tokens: --bf-primary, --bf-background, --bf-foreground, etc.
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-[11px] text-muted-foreground/60">
                    Use --bf-* tokens for overrides
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
      {ADVANCED_COLOR_TOKENS.map(({ key, label }) => (
        <StyleColorPicker
          key={key}
          label={label}
          value={customization[key] || resolved[key] || "#000000"}
          onChange={(v) => updateField(key, v)}
        />
      ))}
    </>
  );
}
