import { useEmojiDropdownMenuState } from "@platejs/emoji/react";
import { ImageIcon, Settings, Smile, Upload, X } from "lucide-react";
import { useState } from "react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef } from "platejs/react";
import AvatarUpload from "@/components/file-upload/avatar-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmojiPicker } from "@/components/ui/emoji-toolbar-button";
import { createFormButtonNode } from "@/components/ui/form-button-node";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomizeSidebar } from "@/hooks/use-customize-sidebar";
import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

function isEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRange = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return str.length <= 4 && emojiRange.test(str);
}

export interface FormHeaderElementData {
  type: "formHeader";
  id?: string;
  title: string;
  icon: string | null;
  cover: string | null;
  children: [{ text: "" }];
}

export function createFormHeaderNode(
  data: Partial<Omit<FormHeaderElementData, "type" | "children">> = {},
): FormHeaderElementData {
  return {
    type: "formHeader",
    title: data.title ?? "",
    icon: data.icon ?? null,
    cover: data.cover ?? null,
    children: [{ text: "" }],
  };
}

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
          <Upload className="h-8 w-8" />
          <span className="text-sm font-medium">Upload cover image</span>
          <span className="text-xs">Max 5MB</span>
        </div>
      </button>
      {errors.length > 0 && <div className="text-destructive text-sm">{errors[0]}</div>}
    </div>
  );
}

export function FormHeaderElement(props: PlateElementProps) {
  const { element, children } = props;
  const editor = useEditorRef();
  const { toggle: toggleCustomize } = useCustomizeSidebar();

  const title = (element.title as string) || "";
  const icon = (element.icon as string | null) || null;
  const cover = (element.cover as string | null) || null;

  const hasCover = !!cover;
  const hasLogo = !!icon;

  const updateHeader = (updates: Partial<FormHeaderElementData>) => {
    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.setNodes(updates, { at: path });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    updateHeader({ title: newTitle });
  };

  const handleIconChange = (newIcon: string | null) => {
    updateHeader({ icon: newIcon });
  };

  const handleCoverChange = (newCover: string | null) => {
    updateHeader({ cover: newCover });
  };

  const handleAddCover = () => handleCoverChange("#FFE4E1");

  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const {
    emojiPickerState,
    isOpen: emojiIsOpen,
    setIsOpen: setEmojiIsOpen,
  } = useEmojiDropdownMenuState();

  return (
    <PlateElement {...props}>
      <div contentEditable={false} className="group relative w-full flex flex-col mb-4 select-none">
        {hasCover && (
          <>
            <div className="relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[120px] sm:h-[200px] group/cover bg-muted/20">
              {cover && !cover.startsWith("#") ? (
                <img
                  src={cover}
                  alt="Cover"
                  className="w-full h-full object-cover border-0 rounded-none"
                />
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
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/80 hover:bg-white text-xs h-7"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    Change cover
                  </Button>
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
                        onClick={() => handleCoverChange("#FFE4E1")}
                        className="h-16 bg-[#FFE4E1] rounded cursor-pointer hover:ring-2 ring-primary transition-all"
                        aria-label="Pink color"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
                          )
                        }
                        className="h-16 bg-blue-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Blue gradient"
                      >
                        <img
                          src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"
                          alt="Blue gradient"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80",
                          )
                        }
                        className="h-16 bg-purple-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Purple gradient"
                      >
                        <img
                          src="https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"
                          alt="Purple gradient"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
                          )
                        }
                        className="h-16 bg-green-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Green gradient"
                      >
                        <img
                          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80"
                          alt="Green gradient"
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCoverChange(null)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="col-span-4 mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                      >
                        <X className="h-4 w-4" /> Remove cover
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
                        <X className="h-4 w-4" /> Remove cover
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
                  className={cn(
                    "relative z-10 mb-1",
                    hasCover ? "-mt-[40px] sm:-mt-[50px]" : "mt-4 sm:mt-6",
                  )}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {icon && icon !== "default-icon" ? (
                        isEmoji(icon) ? (
                          <span
                            className="text-[80px] sm:text-[100px] leading-none inline-block"
                            role="img"
                            aria-label="Form icon"
                          >
                            {icon}
                          </span>
                        ) : (
                          <img
                            src={icon}
                            alt="Logo"
                            className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-md object-cover"
                          />
                        )
                      ) : (
                        <span
                          className="text-[80px] sm:text-[100px] leading-none inline-block"
                          role="img"
                          aria-label="Form icon"
                        >
                          📄
                        </span>
                      )}
                    </button>
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
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <Smile className="mr-1.5 h-3.5 w-3.5" />
                      Add icon
                    </Button>
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
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Customize
                </Button>
              </div>

              <PopoverContent align="start" side="bottom" className="w-auto p-0">
                <Tabs defaultValue="emoji" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-b-none">
                    <TabsTrigger value="emoji">Emoji</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                  </TabsList>
                  <TabsContent value="emoji" className="mt-0">
                    <EmojiPicker
                      {...emojiPickerState}
                      isOpen={emojiIsOpen}
                      setIsOpen={setEmojiIsOpen}
                      onSelectEmoji={(emoji) => {
                        handleIconChange(emoji.skins[0].native);
                        setIconPopoverOpen(false);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="upload" className="p-4 flex flex-col items-center">
                    <AvatarUpload
                      onFileChange={(file) => {
                        if (file?.preview) {
                          handleIconChange(file.preview);
                          setIconPopoverOpen(false);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleIconChange(null);
                        setIconPopoverOpen(false);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Remove icon
                    </Button>
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>

            <div className="relative group/title">
              <input
                type="text"
                className="w-full text-4xl sm:text-9xl font-serif font-light -tracking-5 leading-tight border-none outline-none bg-transparent placeholder:text-muted-foreground/50 placeholder:font-light py-1 sm:py-2 h-auto select-text placeholder:font-serif"
                placeholder="Create your form."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
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
