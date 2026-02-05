import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
}

export function EmbedConfigPanel({ embedType, form }: EmbedConfigPanelProps) {
  return (
    <div className="space-y-6">
      {/* Standard Embed Options */}
      {embedType === "standard" && (
        <div className="space-y-4">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Appearance
          </Label>

          {/* Height */}
          <form.Field name="height">
            {(field: any) => (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[12px] font-medium">Height</Label>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Pixels</span>
                </div>
                <Input
                  type="number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                  className="h-9 bg-muted/30 border-muted-foreground/20 rounded-lg"
                />
              </div>
            )}
          </form.Field>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            <form.Field name="dynamicHeight">
              {(field: any) => (
                <ToggleRow
                  label="Dynamic height"
                  description="Adjust iframe to content"
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                />
              )}
            </form.Field>
            <form.Field name="hideTitle">
              {(field: any) => (
                <ToggleRow
                  label="Hide form title"
                  description="Removes the title"
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                />
              )}
            </form.Field>
            <form.Field name="alignLeft">
              {(field: any) => (
                <ToggleRow
                  label="Align left"
                  description="Left align elements"
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                />
              )}
            </form.Field>
            <form.Field name="transparentBackground">
              {(field: any) => (
                <ToggleRow
                  label="Transparency"
                  description="Invisible background"
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                />
              )}
            </form.Field>
          </div>
        </div>
      )}

      {/* Popup Embed Options */}
      {embedType === "popup" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Trigger & Position
            </Label>

            {/* Open Trigger */}
            <form.Field name="popupTrigger">
              {(field: any) => (
                <div className="space-y-2">
                  <Label className="text-[12px] font-medium">Open when</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v: string) => field.handleChange(v)}
                  >
                    <SelectTrigger className="w-full h-9 bg-muted/30 border-muted-foreground/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="button">On button click</SelectItem>
                      <SelectItem value="auto">Automatically</SelectItem>
                      <SelectItem value="scroll">After scrolling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Position */}
            <form.Field name="popupPosition">
              {(field: any) => (
                <div className="space-y-2">
                  <Label className="text-[12px] font-medium">Position</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v: string) => field.handleChange(v)}
                  >
                    <SelectTrigger className="w-full h-9 bg-muted/30 border-muted-foreground/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom right</SelectItem>
                      <SelectItem value="bottom-left">Bottom left</SelectItem>
                      <SelectItem value="center">Center Modal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Width */}
            <form.Field name="popupWidth">
              {(field: any) => (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[12px] font-medium">Popup width</Label>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Pixels</span>
                  </div>
                  <Input
                    type="number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                    className="h-9 bg-muted/30 border-muted-foreground/20 rounded-lg"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Visuals
            </Label>

            <div className="space-y-3">
              <form.Field name="darkOverlay">
                {(field: any) => (
                  <ToggleRow
                    label="Dark overlay"
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(v)}
                  />
                )}
              </form.Field>

              {/* Emoji Section */}
              <form.Field name="emoji">
                {(emojiField: any) => (
                  <div className="space-y-2">
                    <ToggleRow
                      label="Show Emoji icon"
                      checked={emojiField.state.value}
                      onCheckedChange={(v) => emojiField.handleChange(v)}
                    />

                    {emojiField.state.value && (
                      <div className="space-y-2.5 pl-3 py-2.5 border-l-2 border-muted bg-muted/20 rounded-r-lg">
                        <form.Field name="emojiIcon">
                          {(field: any) => (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-bold uppercase">
                                Character
                              </Label>
                              <Input
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                className="h-8 bg-background border-muted-foreground/20 text-lg text-center"
                              />
                            </div>
                          )}
                        </form.Field>
                        <form.Field name="emojiAnimation">
                          {(field: any) => (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-bold uppercase">
                                Animation
                              </Label>
                              <Select
                                value={field.state.value}
                                onValueChange={(v: string) => field.handleChange(v)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="wave">Wave</SelectItem>
                                  <SelectItem value="bounce">Bounce</SelectItem>
                                  <SelectItem value="pulse">Pulse</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </form.Field>
                      </div>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Behavior
            </Label>

            <div className="space-y-3">
              <form.Field name="hideOnSubmit">
                {(hideField: any) => (
                  <>
                    <ToggleRow
                      label="Hide on submit"
                      description="Close after success"
                      checked={hideField.state.value}
                      onCheckedChange={(v) => hideField.handleChange(v)}
                    />

                    {hideField.state.value && (
                      <form.Field name="hideOnSubmitDelay">
                        {(field: any) => (
                          <div className="space-y-2 pl-3 py-2.5 border-l-2 border-muted bg-muted/20 rounded-r-lg">
                            <Label className="text-[10px] text-muted-foreground font-bold uppercase">
                              Delay (seconds)
                            </Label>
                            <Input
                              type="number"
                              value={field.state.value}
                              step={0.1}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                              onBlur={field.handleBlur}
                              className="h-8 bg-background border-muted-foreground/20"
                            />
                          </div>
                        )}
                      </form.Field>
                    )}
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      )}

      {/* Full Page Options */}
      {embedType === "fullpage" && (
        <div className="space-y-4">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Appearance
          </Label>
          <form.Field name="transparentBackground">
            {(field: any) => (
              <ToggleRow
                label="Transparent background"
                description="Remove page background"
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            )}
          </form.Field>
        </div>
      )}

      {/* Pro Settings */}
      <div className="space-y-4 pt-4 border-t border-muted/60">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Pro Settings
        </Label>

        <div className="space-y-3">
          <form.Field name="trackEvents">
            {(field: any) => (
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <Label className="text-[12px] font-medium flex items-center gap-1.5 cursor-pointer">
                    Analytics tracking
                    <HelpCircle className="h-3 w-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Record views & submissions</p>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="customDomain">
            {(field: any) => (
              <div className="flex items-center justify-between opacity-70 cursor-not-allowed">
                <div className="space-y-0.5">
                  <Label className="text-[12px] font-medium flex items-center gap-1.5">
                    Custom domain
                    <Badge
                      variant="secondary"
                      className="text-[8px] h-3.5 px-1 font-bold bg-purple-50 text-purple-600 border-purple-100 uppercase"
                    >
                      Pro
                    </Badge>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Use your own domain</p>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                  disabled
                />
              </div>
            )}
          </form.Field>

          <form.Field name="branding">
            {(field: any) => (
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <Label className="text-[12px] font-medium flex items-center gap-1.5 cursor-pointer">
                    Better Forms branding
                    <Badge
                      variant="secondary"
                      className="text-[8px] h-3.5 px-1 font-bold bg-[#FFF1F2] text-[#E11D48] border-[#FFE4E6] uppercase"
                    >
                      Pro
                    </Badge>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Show "Made with Better Forms"</p>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="space-y-0.5">
        <Label className="text-[12px] font-medium cursor-pointer">{label}</Label>
        {description && (
          <p className="text-[10px] text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
