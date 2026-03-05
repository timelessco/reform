import { useEmojiDropdownMenuState } from "@platejs/emoji/react";
import { ImageIcon, SettingsIcon, SmileIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useFileUpload } from "@/hooks/use-file-upload";
import type { FormHeaderElementData } from "@/lib/form-header-factory";
import { cn } from "@/lib/utils";

function isEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRange =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return str.length <= 4 && emojiRange.test(str);
}

export { createFormHeaderNode, type FormHeaderElementData } from "@/lib/form-header-factory";

function CoverUpload({
  onFileChange,
}: {
  onFileChange: (url: string) => void;
}) {
  const [
    { isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
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
          <span className="text-sm font-medium">Upload cover image</span>
          <span className="text-xs">Max 5MB</span>
        </div>
      </button>
      {errors.length > 0 && (
        <div className="text-destructive text-sm">{errors[0]}</div>
      )}
    </div>
  );
}

export function FormHeaderElement(props: PlateElementProps) {
  const { element, children } = props;
  const editor = useEditorRef();
  const { activeSidebar, setActiveSidebar, closeSidebar } = useEditorSidebar();
  const toggleCustomize = () => {
    if (activeSidebar === "customize") {
      closeSidebar();
    } else {
      setActiveSidebar("customize");
    }
  };

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

  const handleCoverChange = (newCover: string | null) => {
    updateHeader({ cover: newCover });
  };

  const handleAddCover = () =>   handleCoverChange(
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80&tint=true",
  )

  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const {
    emojiPickerState,
    isOpen: emojiIsOpen,
    setIsOpen: setEmojiIsOpen,
  } = useEmojiDropdownMenuState();

  return (
    <PlateElement {...props}>
      <div
        contentEditable={false}
        className="group relative w-full flex flex-col mb-4 select-none rounded-none"
      >
        {hasCover && (
          <>
            <div className="relative w-screen left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[120px] sm:h-[200px] group/cover bg-muted/20" data-bf-cover>
              {cover && !cover.startsWith("#") ? (
                <>
                  {cover.includes("tint=true") && (
                    <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                  )}
                  <img
                    src={cover}
                    alt="Cover"
                    className={cn(
                      "w-full h-full object-cover border-0 ",
                      cover.includes("tint=true") &&
                        "relative z-0 brightness-60 grayscale",
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
                    <TabsContent
                      value="gallery"
                      className="grid grid-cols-4 gap-2 pt-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverChange(
                            "https://images.unsplash.com/photo-1604076850742-4c7221f3101b?w=800&q=80&tint=true",
                          )
                        }
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Abstract mesh"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?w=800&q=80&tint=true"
                          alt="Abstract mesh"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Abstract gradient"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&q=80&tint=true"
                          alt="Abstract gradient"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Abstract geometric"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80&tint=true"
                          alt="Abstract geometric"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Abstract liquid"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80&tint=true"
                          alt="Abstract liquid"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="3D shapes"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80&tint=true"
                          alt="3D shapes"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Gradient curves"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80&tint=true"
                          alt="Gradient curves"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Geometric waves"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80&tint=true"
                          alt="Geometric waves"
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
                        className="h-16 bg-muted rounded relative cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                        aria-label="Abstract paint"
                      >
                        <div className="absolute inset-0 z-1 bg-primary opacity-50 mix-blend-color pointer-events-none" />
                        <img
                          src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80&tint=true"
                          alt="Abstract paint"
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
                    hasCover && (!icon || icon === "default-icon" || isEmoji(icon))
                      ? "true"
                      : undefined
                  }
                  data-bf-logo-container={
                    hasCover && icon && icon !== "default-icon" && !isEmoji(icon)
                      ? "true"
                      : undefined
                  }
                >
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="cursor-pointer transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                      />
                    }
                  >
                    {icon && icon !== "default-icon" ? (
                      isEmoji(icon) ? (
                        <span
                          className="text-[80px] sm:text-[100px] leading-none inline-block"
                          role="img"
                          aria-label="Form icon"
                          data-bf-logo-emoji
                        >
                          {icon}
                        </span>
                      ) : (
                        <img
                          src={icon}
                          alt="Logo"
                          className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-md object-cover"
                          data-bf-logo
                        />
                      )
                    ) : (
                      <span
                        className="text-[80px] sm:text-[100px] leading-none inline-block"
                        role="img"
                        aria-label="Form icon"
                        data-bf-logo-emoji
                      >
                        📄
                      </span>
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
                    <SmileIcon className="mr-1.5 h-3.5 w-3.5" />
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
                className="w-auto p-0"
              >
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
                  <TabsContent
                    value="upload"
                    className="p-4 flex flex-col items-center"
                  >
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
              <textarea
                ref={titleRef}
                rows={1}
                className="w-full text-4xl sm:text-[48px] font-serif font-light -tracking-[0.03em] leading-[1.15] border-none outline-none bg-transparent text-foreground placeholder:text-foreground/50 placeholder:font-light py-1 sm:py-2 h-auto select-text placeholder:font-serif resize-none overflow-hidden"
                placeholder="Create your form."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onFocus={autoResizeTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Check if onboarding content is present (by type)
                    const secondBlock = editor.children[1] as any;
                    const isOnboarding =
                      secondBlock?.type === "onboardingContent";

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
                      const startPoint = (editor.api as any).edges(
                        firstBlockPath,
                      )?.[0];
                      if (startPoint) {
                        editor.tf.select(startPoint);
                        editor.tf.focus();
                      }
                    } else {
                      // Normal behavior: move focus to first block
                      const firstBlockPath = [1];
                      const startPoint = (editor.api as any).edges(
                        firstBlockPath,
                      )?.[0];
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
