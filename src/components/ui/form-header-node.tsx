import { ImageIcon, SettingsIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { IconPickerContent, IconPickerPreview } from "@/components/icon-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef } from "platejs/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorTheme } from "@/contexts/editor-theme-context";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  ImageCrop,
  ImageCropContent,
  ImageCropApply,
  ImageCropReset,
} from "@/components/ui/image-crop";
import type { FormHeaderElementData } from "@/lib/form-header-factory";
import { THEME_COLORS } from "@/lib/theme-presets";
import { cn, isValidUrl, DEFAULT_ICON } from "@/lib/utils";

export { createFormHeaderNode, type FormHeaderElementData } from "@/lib/form-header-factory";

// Static derivations from THEME_COLORS — hoisted to module scope to avoid re-computing on every render
const ACCENT_COLORS = Object.values(THEME_COLORS).map((t) => t.primary);
const PRIMARY_TO_THEME_NAME = new Map(
  Object.entries(THEME_COLORS).map(([name, t]) => [t.primary, name]),
);

function CoverUpload({ onFileChange }: { onFileChange: (url: string) => void }) {
  const [
    { isDragging, errors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, getInputProps },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: "image/*",
    multiple: false,
    onFilesChange: (files) => {
      if (files[0]?.preview) {
        onFileChange(files[0].preview);
      }
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <button
        className={cn(
          "group/cover-upload relative h-32 w-full cursor-pointer overflow-hidden rounded-md border-2 border-dashed transition-colors flex items-center justify-center",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/20 hover:bg-muted/50",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        type="button"
      >
        <input {...getInputProps()} className="sr-only" />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <UploadIcon className="h-8 w-8" />
          <span className="text-sm">Upload cover image</span>
          <span className="text-xs">Max 5MB</span>
        </div>
      </button>
      {errors.length > 0 && <div className="text-destructive text-sm">{errors[0]}</div>}
    </div>
  );
}

function IconUploadTab({
  currentIcon,
  onUpload,
  onRemove,
}: {
  currentIcon: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [
    { isDragging, errors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, getInputProps },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: "image/*",
    multiple: false,
    onFilesChange: (files) => {
      if (files[0]?.file) {
        setSelectedFile(files[0]?.file as File);
      }
    },
  });

  // Crop view
  if (selectedFile) {
    return (
      <div className="h-[368px] w-[310px] bg-muted/50 px-3 flex flex-col">
        <div className="flex items-center justify-between border-b border-b-border py-3">
          <span className="text-sm text-foreground">Crop image</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
        <ImageCrop
          file={selectedFile}
          aspect={1}
          onCrop={(croppedImage) => {
            onUpload(croppedImage);
            setSelectedFile(null);
          }}
        >
          <div className="flex-1 flex items-center justify-center py-3 overflow-hidden">
            <ImageCropContent className="max-h-[250px] max-w-full rounded-lg" />
          </div>
          <div className="flex items-center justify-between pb-3 pt-1">
            <ImageCropReset
              render={
                <button
                  type="button"
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-lg hover:bg-muted"
                />
              }
            >
              Reset
            </ImageCropReset>
            <ImageCropApply
              render={
                <button
                  type="button"
                  className="text-[13px] text-primary hover:text-primary/80 transition-colors px-4 py-1 rounded-lg bg-primary/10 hover:bg-primary/15"
                />
              }
            >
              Apply
            </ImageCropApply>
          </div>
        </ImageCrop>
      </div>
    );
  }

  // Upload view
  return (
    <div className="h-[368px] w-[310px] bg-muted/50 px-3 flex flex-col">
      <div className="flex items-center border-b border-b-border py-3">
        <span className="text-sm text-foreground">Upload an image</span>
      </div>

      <div className="flex-1 flex items-center justify-center py-4">
        <button
          type="button"
          className={cn(
            "group/upload w-full h-full rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative overflow-hidden",
            isDragging
              ? "border-primary bg-primary/5 scale-[0.98]"
              : "border-muted-foreground/25 hover:border-muted-foreground/40 bg-background hover:bg-muted/50",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input {...getInputProps()} className="sr-only" />
          {currentIcon ? (
            <div className="w-full h-full p-3 flex flex-col items-center justify-center gap-3">
              <img
                src={currentIcon}
                alt="Current icon"
                width={180}
                height={180}
                className="max-w-[180px] max-h-[180px] rounded-lg object-contain"
              />
              <span className="text-xs text-muted-foreground group-hover/upload:text-foreground transition-colors">
                Click to replace
              </span>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors",
                  isDragging ? "bg-primary/15" : "bg-primary/10 group-hover/upload:bg-primary/15",
                )}
              >
                <UploadIcon
                  className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    isDragging ? "text-primary" : "text-primary/70 group-hover/upload:text-primary",
                  )}
                />
              </div>
              <p className="text-[13px] text-foreground">Drop your image here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2 tracking-wide uppercase">
                PNG, JPG, SVG · Max 5MB
              </p>
            </>
          )}
        </button>
      </div>

      {errors.length > 0 && (
        <p className="text-destructive text-xs pb-2 text-center">{errors[0]}</p>
      )}

      <div className="flex justify-center pb-3 pt-1">
        <button
          type="button"
          onClick={onRemove}
          onMouseDown={(e) => e.preventDefault()}
          className="text-[13px] text-muted-foreground hover:text-destructive transition-colors px-3 py-1 rounded-lg hover:bg-muted"
        >
          Remove icon
        </button>
      </div>
    </div>
  );
}

const iconTabs = [
  { value: "icon", label: "Icon" },
  { value: "upload", label: "Upload" },
] as const;

function IconTabBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = iconTabs;
  const activeIndex = items.findIndex((t) => t.value === value);
  const count = items.length;
  const pillLeft = `calc(${(activeIndex / count) * 100}% + 3px)`;
  const pillWidth = `calc(${100 / count}% - ${6 / count}px)`;

  return (
    <div className="relative bg-secondary rounded-[10px] p-[3px] w-full flex">
      <div
        className="absolute top-[3px] bottom-[3px] rounded-[8px] bg-white shadow-[0px_0px_1.5px_0px_rgba(0,0,0,0.16),0px_2px_5px_0px_rgba(0,0,0,0.14)] dark:bg-background z-0 transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ left: pillLeft, width: pillWidth }}
      />
      {items.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative z-10 flex-1 h-7 rounded-[8px] text-sm text-center transition-colors",
            value === tab.value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function FormHeaderElement(props: PlateElementProps) {
  const { element, children } = props;
  const editor = useEditorRef();
  const {
    hasCustomization,
    themeVars,
    customization: editorCustomization,
    updateThemeColor,
  } = useEditorTheme();
  const { activeSidebar, closeSidebar, openCustomize } = useEditorSidebar();
  const toggleCustomize = () => {
    if (activeSidebar === "customize") {
      closeSidebar();
    } else {
      openCustomize();
    }
  };

  const title = (element.title as string) || "";
  const icon = (element.icon as string | null) || null;
  const iconColor = (element.iconColor as string | null) || null;
  const cover = (element.cover as string | null) || null;

  const hasCover = !!cover;
  const hasLogo = !!icon;

  const updateHeader = (updates: Partial<FormHeaderElementData>) => {
    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.setNodes(updates, { at: path });
    }
  };

  const titleRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResizeTitle();
  }, [title, autoResizeTitle]);

  const handleTitleChange = (newTitle: string) => {
    updateHeader({ title: newTitle });
  };

  const handleIconChange = (newIcon: string | null) => {
    updateHeader({ icon: newIcon });
  };

  const handleIconColorChange = (newColor: string) => {
    updateHeader({ iconColor: newColor });
  };

  const handleCoverChange = (newCover: string | null) => {
    updateHeader({ cover: newCover });
  };

  const handleAddCover = () =>
    handleCoverChange(
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80&tint=true",
    );

  const accentColors = hasCustomization ? ACCENT_COLORS : undefined;
  const activeThemeColorName = editorCustomization?.themeColor || "zinc";
  const activeAccentColor =
    THEME_COLORS[activeThemeColorName]?.primary || THEME_COLORS.zinc.primary;

  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [iconTab, setIconTab] = useState("icon");

  return (
    <PlateElement {...props}>
      <div
        contentEditable={false}
        className="group relative w-full flex flex-col mb-4 select-none rounded-none"
      >
        {hasCover && (
          <>
            <div
              className="relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[120px] sm:h-[200px] group/cover bg-muted/20"
              data-bf-cover
            >
              {cover && !cover.startsWith("#") ? (
                <>
                  {cover.includes("tint=true") && (
                    <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                  )}
                  <img
                    src={cover}
                    alt="Cover"
                    width={800}
                    height={200}
                    className={cn(
                      "w-full h-full object-cover border-0 ",
                      cover.includes("tint=true") && "relative z-0 brightness-60 grayscale",
                    )}
                  />
                </>
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundColor: cover?.startsWith("#") ? cover : "#FFE4E1",
                  }}
                />
              )}
            </div>
            <div className="absolute top-2 right-4 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/80 hover:bg-white text-xs h-7"
                      onMouseDown={(e) => e.preventDefault()}
                    />
                  }
                >
                  Change cover
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cover Image</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="gallery" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="gallery">Gallery</TabsTrigger>
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>
                    <TabsContent value="gallery" className="grid grid-cols-4 gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1604076850742-4c7221f3101b?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Abstract mesh"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?w=800&q=80&tint=true"
                          alt="Abstract mesh"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Abstract gradient"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&q=80&tint=true"
                          alt="Abstract gradient"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Abstract geometric"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80&tint=true"
                          alt="Abstract geometric"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Abstract liquid"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&tint=true"
                          alt="Abstract liquid"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="3D shapes"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80&tint=true"
                          alt="3D shapes"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Gradient curves"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80&tint=true"
                          alt="Gradient curves"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Geometric waves"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80&tint=true"
                          alt="Geometric waves"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-[opacity,transform]"
                        aria-label="Abstract paint"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80&tint=true"
                          alt="Abstract paint"
                          width={200}
                          height={64}
                          className="relative z-0 w-full h-full object-cover brightness-60 grayscale"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCoverChange(null)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="col-span-4 mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                      >
                        <XIcon className="h-4 w-4" /> Remove cover
                      </button>
                    </TabsContent>
                    <TabsContent value="upload" className="pt-4">
                      <CoverUpload onFileChange={handleCoverChange} />
                      <button
                        type="button"
                        onClick={() => handleCoverChange(null)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                      >
                        <XIcon className="h-4 w-4" /> Remove cover
                      </button>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>

              <Button
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-xs h-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleCoverChange(null)}
                onMouseDown={(e) => e.preventDefault()}
              >
                Remove
              </Button>
            </div>
          </>
        )}

        <div className={cn("relative w-full flex flex-col")}>
          <div className="w-full">
            <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
              {hasLogo && (
                <div
                  className={cn("relative z-10 mb-1", hasCover ? "" : "mt-4 sm:mt-6")}
                  data-bf-logo-emoji-container={
                    hasCover && icon && !isValidUrl(icon) ? "true" : undefined
                  }
                  data-bf-logo-container={hasCover && icon && isValidUrl(icon) ? "true" : undefined}
                >
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="cursor-pointer transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Change icon"
                      />
                    }
                  >
                    {icon && icon !== DEFAULT_ICON ? (
                      isValidUrl(icon) ? (
                        <img
                          src={icon}
                          alt="Logo"
                          width={120}
                          height={120}
                          className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-md object-cover"
                          data-bf-logo
                        />
                      ) : (
                        <IconPickerPreview
                          icon={icon}
                          iconColor={hasCustomization ? undefined : iconColor || undefined}
                          useThemeColor={hasCustomization || !iconColor}
                          iconSize="48"
                          size="100"
                        />
                      )
                    ) : (
                      <IconPickerPreview
                        icon={null}
                        iconColor={undefined}
                        useThemeColor
                        iconSize="48"
                        size="100"
                      />
                    )}
                  </PopoverTrigger>
                </div>
              )}

              <div
                className={cn(
                  "flex gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  !hasCover && !hasLogo && "mt-8 sm:mt-12",
                  hasCover && !hasLogo && "mt-4",
                  !hasCover && hasLogo && "mt-0",
                )}
              >
                {!hasLogo && (
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                      />
                    }
                  >
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                    Add icon
                  </PopoverTrigger>
                )}
                {!hasCover && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
                    onClick={handleAddCover}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                    Add cover
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
                  onClick={toggleCustomize}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
                  Customize
                </Button>
              </div>

              <PopoverContent
                align="start"
                side="bottom"
                className={cn(
                  "w-[310px] p-0",
                  hasCustomization && "bf-themed",
                  hasCustomization && editorCustomization?.mode === "dark" && "dark",
                )}
                style={hasCustomization ? themeVars : undefined}
              >
                <div className="w-full">
                  <div className="px-3 pt-2 pb-1">
                    <IconTabBar value={iconTab} onChange={setIconTab} />
                  </div>
                  {iconTab === "icon" ? (
                    <IconPickerContent
                      iconValue={icon && icon !== DEFAULT_ICON && !isValidUrl(icon) ? icon : null}
                      iconColor={hasCustomization ? activeAccentColor : iconColor || "#000000"}
                      onIconChange={(newIcon) => {
                        handleIconChange(newIcon);
                        setIconPopoverOpen(false);
                      }}
                      onColorChange={(color) => {
                        if (hasCustomization && updateThemeColor) {
                          const themeName = PRIMARY_TO_THEME_NAME.get(color);
                          if (themeName) updateThemeColor(themeName);
                        } else {
                          handleIconColorChange(color);
                        }
                      }}
                      colors={accentColors}
                    />
                  ) : (
                    <IconUploadTab
                      currentIcon={icon && isValidUrl(icon) ? icon : null}
                      onUpload={(url) => {
                        handleIconChange(url);
                        setIconPopoverOpen(false);
                      }}
                      onRemove={() => {
                        handleIconChange(null);
                        setIconPopoverOpen(false);
                      }}
                    />
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="relative group/title">
              <textarea
                ref={titleRef}
                rows={1}
                aria-label="Form title"
                className="w-full text-[48px] font-['Timeless_Serif'] placeholder:font-['Timeless_Serif'] font-[252] leading-tight tracking-[-1.44px] border-none outline-none bg-transparent text-foreground placeholder:text-foreground/50 py-1 sm:py-2 h-auto select-text resize-none overflow-hidden"
                placeholder="Create your form."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onFocus={autoResizeTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Check if onboarding content is present (by type)
                    const secondBlock = editor.children[1] as any;
                    const isOnboarding = secondBlock?.type === "onboardingContent";

                    if (isOnboarding) {
                      // Clear to empty state: header + empty paragraph + submit button
                      const currentHeader = editor.children[0];
                      const emptyContent = [
                        currentHeader,
                        { type: "p", children: [{ text: "" }] },
                        createFormButtonNode("submit"),
                      ];
                      editor.tf.init({
                        value: emptyContent as any,
                      });
                      // Move cursor to first paragraph
                      const firstBlockPath = [1];
                      const startPoint = (editor.api as any).edges(firstBlockPath)?.[0];
                      if (startPoint) {
                        editor.tf.select(startPoint);
                        editor.tf.focus();
                      }
                    } else {
                      // Normal behavior: move focus to first block
                      const firstBlockPath = [1];
                      const startPoint = (editor.api as any).edges(firstBlockPath)?.[0];
                      if (startPoint) {
                        editor.tf.select(startPoint);
                        editor.tf.focus();
                      }
                    }
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      </div>
      {children}
    </PlateElement>
  );
}
