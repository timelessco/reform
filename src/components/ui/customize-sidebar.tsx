import { useCallback, useMemo } from "react";
import { InfoIcon, XIcon } from "@/components/ui/icons";
import { APP_NAME } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Textarea } from "@/components/ui/textarea";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useForm, useLocalForm } from "@/hooks/use-live-hooks";
import { formCollection, localFormCollection } from "@/db-collections/form.collections";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { SidebarSection } from "@/components/ui/sidebar-section";
import {
  ConfigCard,
  ConfigRow,
  selectTriggerCls,
} from "@/components/form-builder/embed-config-panel";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { StyleColorPicker, StyleNumberInput } from "@/components/ui/style-controls";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STYLES, BASE_COLORS, DARK_BASE_COLORS, THEME_COLORS } from "@/lib/theme-presets";
import { FONT_REGISTRY } from "@/lib/font-registry";
import { loadGoogleFont } from "@/lib/load-google-font";
import { TOKEN_NAMES } from "@/lib/generate-theme-css";

const FONT_OPTIONS = Object.keys(FONT_REGISTRY).map((name) => ({
  label: name,
  value: name,
}));

const STYLE_OPTIONS: { label: string; value: string }[] = [
  { label: "Vega", value: "vega" },
  { label: "Nova", value: "nova" },
  { label: "Maia", value: "maia" },
  { label: "Lyra", value: "lyra" },
  { label: "Mira", value: "mira" },
];

const THEME_COLOR_OPTIONS: { label: string; value: string }[] = [
  { label: "Neutral", value: "neutral" },
  { label: "Zinc", value: "zinc" },
  { label: "Rose", value: "rose" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
  { label: "Amber", value: "amber" },
  { label: "Orange", value: "orange" },
  { label: "Violet", value: "violet" },
  { label: "Emerald", value: "emerald" },
  { label: "Cyan", value: "cyan" },
  { label: "Indigo", value: "indigo" },
  { label: "Pink", value: "pink" },
  { label: "Red", value: "red" },
];

const BASE_COLOR_OPTIONS: { label: string; value: string }[] = [
  { label: "Neutral", value: "neutral" },
  { label: "Zinc", value: "zinc" },
  { label: "Slate", value: "slate" },
  { label: "Stone", value: "stone" },
  { label: "Gray", value: "gray" },
];

const RADIUS_OPTIONS: { label: string; value: string }[] = [
  { label: "None", value: "none" },
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
];

const CONFIG_INPUT_CLS = "!rounded-none !border-0 bg-secondary !h-[34px]";

const ColorSwatch = ({ color }: { color?: string }) => {
  if (!color) return null;
  return (
    <div
      className="size-3 rounded-full border border-border/60 shrink-0"
      style={{ backgroundColor: color }}
    />
  );
};

const ProBadge = () => (
  <div className="bg-teal-100 dark:bg-teal-700/20 text-teal-700 dark:text-teal-400 text-[9px] px-1.5 py-px rounded-[4px] font-bold uppercase tracking-wider shadow-sm">
    Pro
  </div>
);

interface CustomizeSidebarProps {
  formId: string;
  isLocal?: boolean;
}

export const CustomizeSidebar = ({ formId, isLocal }: CustomizeSidebarProps) => {
  const { closeSidebar } = useEditorSidebar();
  const { setTheme } = useTheme();
  const cloudForm = useForm(isLocal ? undefined : formId);
  const localFormResult = useLocalForm(isLocal ? formId : undefined);
  const formResult = isLocal ? localFormResult : cloudForm;
  const formDoc = formResult.data?.[0] ?? null;
  const collection = isLocal ? localFormCollection : formCollection;

  const customization = useMemo(
    () => (formDoc?.customization ?? {}) as Record<string, string>,
    [formDoc?.customization],
  );

  // Resolve the active style to get fallback values
  const resolvedStyle = useMemo(() => {
    const presetName = customization.preset || "vega";
    return STYLES[presetName] ?? STYLES.vega;
  }, [customization.preset]);

  const getValue = useCallback(
    (field: string) => {
      if (customization[field]) return customization[field];
      if (field === "radius") return resolvedStyle.radius;
      if (field === "spacing") return resolvedStyle.spacing;
      if (field === "baseColor") return resolvedStyle.baseColor;
      if (field === "themeColor") return resolvedStyle.themeColor;
      if (field === "font") return resolvedStyle.font;
      return "";
    },
    [customization, resolvedStyle],
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
    (targetMode: string) => {
      const sourceMode = targetMode === "dark" ? "light" : "dark";
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
      // Sync the app theme with the editor mode
      setTheme(targetMode as "dark" | "light");
    },
    [updateFields, customization, setTheme],
  );

  const activePreset = customization.preset || "vega";
  const activeMode = customization.mode || "light";
  const activeThemeColor = getValue("themeColor");
  const activeBaseColors = activeMode === "dark" ? DARK_BASE_COLORS : BASE_COLORS;
  const activeBaseColor = getValue("baseColor");
  const activeFont = getValue("font");
  const activeRadius = getValue("radius");

  const cssKey = `${activeMode}:customCss`;
  const cssValue = customization[cssKey] || customization.customCss || "";

  const handleThemeColorChange = useCallback(
    (v: string) => {
      if (v) updateFields({ themeColor: v, preset: "custom" });
    },
    [updateFields],
  );

  const handleBaseColorChange = useCallback(
    (v: string) => {
      if (v) updateFields({ baseColor: v, preset: "custom" });
    },
    [updateFields],
  );

  const handleFontChange = useCallback(
    (v: string) => {
      if (!v) return;
      loadGoogleFont(v);
      updateWithCustomPreset("font", v);
    },
    [updateWithCustomPreset],
  );

  const handleCssChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateWithCustomPreset(cssKey, e.target.value);
    },
    [updateWithCustomPreset, cssKey],
  );

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header */}
      <SidebarHeader className="pt-2 pb-3 pl-1 shrink-0 gap-2.25 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-normal text-foreground pl-2.5 font-sans">Customize</h2>
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      {/* Scrollable content */}
      <SidebarContent>
        <div className="p-2 space-y-3">
          {/* Theme section */}
          <SidebarSection label="Theme" className="pb-2.75" action={<></>}>
            <ConfigCard>
              <ConfigRow label="Style">
                <Select value={activePreset} onValueChange={(v) => v && selectStyle(v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    {STYLE_OPTIONS.find((o) => o.value === activePreset)?.label ?? activePreset}
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigRow>
              <ConfigRow label="Accent">
                <Select value={activeThemeColor} onValueChange={handleThemeColorChange}>
                  <SelectTrigger className={selectTriggerCls}>
                    <ColorSwatch color={THEME_COLORS[activeThemeColor]?.primary} />
                    {THEME_COLOR_OPTIONS.find((o) => o.value === activeThemeColor)?.label ??
                      activeThemeColor}
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_COLOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <ColorSwatch color={THEME_COLORS[o.value]?.primary} />
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigRow>
              <ConfigRow label="Base">
                <Select value={activeBaseColor} onValueChange={handleBaseColorChange}>
                  <SelectTrigger className={selectTriggerCls}>
                    <ColorSwatch color={activeBaseColors[activeBaseColor]?.muted} />
                    {BASE_COLOR_OPTIONS.find((o) => o.value === activeBaseColor)?.label ??
                      activeBaseColor}
                  </SelectTrigger>
                  <SelectContent>
                    {BASE_COLOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <ColorSwatch color={activeBaseColors[o.value]?.muted} />
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigRow>
              <ConfigRow label="Font">
                <Select value={activeFont} onValueChange={handleFontChange}>
                  <SelectTrigger className={selectTriggerCls}>
                    {FONT_OPTIONS.find((o) => o.value === activeFont)?.label ?? activeFont}
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigRow>
              <ConfigRow label="Radius">
                <Select
                  value={activeRadius}
                  onValueChange={(v) => v && updateWithCustomPreset("radius", v)}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    {RADIUS_OPTIONS.find((o) => o.value === activeRadius)?.label ?? activeRadius}
                  </SelectTrigger>
                  <SelectContent>
                    {RADIUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigRow>
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
            <p className="text-[12px] text-muted-foreground mb-3">
              Preview advanced customization. {APP_NAME} Pro is required to apply it to the
              published form.
            </p>
            <Button
              variant="outline"
              className="w-full h-7 text-[13px] text-sidebar-foreground bg-background border border-border hover:bg-muted rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
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
                min={0}
                max={100}
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

          {/* Title */}
          <SidebarSection label="Title" action={<ProBadge />}>
            <ConfigCard>
              <ConfigRow label="Font">
                <Select
                  value={getValue("titleFont") || "Timeless Serif"}
                  onValueChange={(v) => {
                    if (!v) return;
                    loadGoogleFont(v);
                    updateWithCustomPreset("titleFont", v);
                  }}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    {FONT_OPTIONS.find(
                      (o) => o.value === (getValue("titleFont") || "Timeless Serif"),
                    )?.label ??
                      (getValue("titleFont") || "Timeless Serif")}
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigRow>
              <StyleNumberInput
                label="Font Size"
                value={getValue("titleFontSize") || "48px"}
                onChange={(v) => updateWithCustomPreset("titleFontSize", v)}
                min={24}
                max={72}
                step={2}
                unit="px"
                displayUnit=""
                className={CONFIG_INPUT_CLS}
              />
              <StyleNumberInput
                label="Letter Spacing"
                value={getValue("titleLetterSpacing") || "-1.44px"}
                onChange={(v) => updateWithCustomPreset("titleLetterSpacing", v)}
                min={-3}
                max={3}
                step={0.25}
                unit="px"
                displayUnit=""
                className={CONFIG_INPUT_CLS}
              />
              <ConfigRow label="Italic" variant="switch">
                <Switch
                  aria-label="Italic"
                  checked={getValue("titleItalic") === "true"}
                  onCheckedChange={(v: boolean) =>
                    updateWithCustomPreset("titleItalic", v ? "true" : "")
                  }
                  size="default"
                />
              </ConfigRow>
            </ConfigCard>
          </SidebarSection>

          {/* Colors — with Light / Dark tabs */}
          <SidebarSection label="Colors" action={<ProBadge />}>
            <Tabs value={activeMode} onValueChange={handleModeToggle} className="mb-2.5">
              <TabsList className="w-full">
                <TabsTrigger value="light">Light</TabsTrigger>
                <TabsTrigger value="dark">Dark</TabsTrigger>
                <TabsIndicator />
              </TabsList>
            </Tabs>
            <ConfigCard>
              <AdvancedColorPickers
                customization={customization}
                updateField={updateWithCustomPreset}
              />
            </ConfigCard>
          </SidebarSection>

          {/* Custom CSS — mode-aware */}
          <SidebarSection label="Custom CSS" action={<ProBadge />}>
            <div className="rounded-lg overflow-hidden border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <Textarea
                value={cssValue}
                onChange={handleCssChange}
                aria-label={`Custom CSS (${activeMode} mode)`}
                className="font-mono text-[11px] h-32 bg-secondary text-foreground border-0 rounded-none focus-visible:ring-2 focus-visible:ring-ring p-3"
                placeholder=".bf-themed { ... }"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-1.5 px-1 pt-2">
              <Tooltip>
                <TooltipTrigger
                  render={<InfoIcon className="h-3 w-3 text-muted-foreground/60 cursor-help" />}
                />
                <TooltipContent side="bottom" className="max-w-[240px] text-[11px]">
                  Supports shadcn tokens: --bf-primary, --bf-background, --bf-foreground, etc.
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
};

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

const AdvancedColorPickers = ({
  customization,
  updateField,
}: {
  customization: Record<string, string>;
  updateField: (field: string, value: string) => void;
}) => {
  const baseColorName = customization.baseColor || "neutral";
  const themeColorName = customization.themeColor || "neutral";
  const isDark = customization.mode === "dark";
  const mode = isDark ? "dark" : "light";
  const baseColors = isDark ? DARK_BASE_COLORS : BASE_COLORS;
  const base = baseColors[baseColorName] ?? baseColors.neutral;
  const theme = THEME_COLORS[themeColorName] ?? THEME_COLORS.neutral;

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
          customization[prefixedKey] || customization[key] || resolved[key] || "#000000";

        return (
          <StyleColorPicker
            key={key}
            label={label}
            value={currentValue}
            onChange={(v) => updateField(prefixedKey, v)}
            className="!rounded-none"
          />
        );
      })}
    </>
  );
};
