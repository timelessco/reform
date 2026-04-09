import type { ReactNode } from "react";
import { createContext, use, useMemo } from "react";

import AvatarUpload from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageIcon, SmileIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// FormHeader context
// ---------------------------------------------------------------------------

interface FormHeaderContextValue {
  title: string;
  icon?: string;
  cover?: string;
  hasCover: boolean;
  hasLogo: boolean;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
  onCoverChange: (cover: string | null) => void;
}

const FormHeaderContext = createContext<FormHeaderContextValue | null>(null);

const useFormHeaderContext = (): FormHeaderContextValue => {
  const ctx = use(FormHeaderContext);

  if (!ctx) {
    throw new Error("FormHeader compound components must be used within <FormHeader>");
  }

  return ctx;
};

// ---------------------------------------------------------------------------
// Internal: CoverUpload (drag-and-drop upload area)
// ---------------------------------------------------------------------------

const CoverUpload = ({ onFileChange }: { onFileChange: (url: string) => void }) => {
  const [
    { isDragging, errors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, getInputProps },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
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
};

// ---------------------------------------------------------------------------
// FormHeader.Cover
// ---------------------------------------------------------------------------

const FormHeaderCover = () => {
  const { cover, onCoverChange } = useFormHeaderContext();

  if (!cover) {
    return null;
  }
  const setCoverUrl = (url: string | null) => onCoverChange(url);

  return (
    <div className="relative w-full h-[120px] sm:h-[200px] group/cover bg-muted/20">
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
              "w-full h-full object-cover",
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
      )}{" "}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-2">
        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/80 hover:bg-white text-xs h-7"
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
                    setCoverUrl(
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
                    setCoverUrl(
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
                    setCoverUrl(
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
                    setCoverUrl(
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
                    setCoverUrl(
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
                    setCoverUrl(
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
                    setCoverUrl(
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
                    setCoverUrl(
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

                {/* Remove Option in Gallery */}
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  className="col-span-4 mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                >
                  <XIcon className="h-4 w-4" /> Remove cover
                </button>
              </TabsContent>
              <TabsContent value="upload" className="pt-4">
                <CoverUpload onFileChange={setCoverUrl} />
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                >
                  <XIcon className="h-4 w-4" /> Remove cover
                </button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FormHeader.Icon
// ---------------------------------------------------------------------------

const FormHeaderIcon = () => {
  const { icon, hasCover, onIconChange } = useFormHeaderContext();

  if (!icon) {
    return null;
  }

  const setLogoUrl = (url: string | null) => onIconChange(url);

  return (
    <button
      type="button"
      className={cn("relative z-10 mb-4", hasCover ? "-mt-[30px] sm:-mt-[40px]" : "mt-6 sm:mt-8")}
    >
      <Dialog>
        <DialogTrigger
          render={
            <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-full overflow-hidden shadow-sm bg-background cursor-pointer hover:ring-2 hover:ring-muted-foreground/20 transition-all group/logo" />
          }
        >
          {icon && icon !== "default-icon" ? (
            <img
              src={icon}
              alt="Logo"
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center text-white">
              <svg
                className="w-6 h-6 sm:w-10 sm:h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <title>Form header placeholder icon</title>
                <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
              </svg>
            </div>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose an icon</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="emoji" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="emoji">Emoji</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>
            <TabsContent
              value="emoji"
              className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-4"
            >
              <span className="text-sm">Emoji picker placeholder</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogoUrl(null)}
                className="text-destructive hover:text-destructive"
              >
                <XIcon className="mr-2 h-4 w-4" /> Remove icon
              </Button>
            </TabsContent>
            <TabsContent value="upload" className="pt-4 flex flex-col items-center">
              <AvatarUpload
                onFileChange={(file) => {
                  if (file?.preview) {
                    setLogoUrl(file.preview);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLogoUrl(null)}
                className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Remove icon
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </button>
  );
};

// ---------------------------------------------------------------------------
// FormHeader.Title
// ---------------------------------------------------------------------------

const FormHeaderTitle = () => {
  const { title, onTitleChange } = useFormHeaderContext();

  return (
    <div className="relative group/title">
      <input
        type="text"
        placeholder="Form title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Form title"
        className="w-full text-2xl sm:text-4xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/50 py-1 sm:py-2 h-auto focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Internal: ActionButtons (add icon / add cover buttons)
// ---------------------------------------------------------------------------

const ActionButtons = () => {
  const { hasCover, hasLogo, onIconChange, onCoverChange } = useFormHeaderContext();
  const handleAddCover = () => onCoverChange("#FFE4E1");
  const handleAddIcon = () => onIconChange("default-icon");

  return (
    <div
      className={cn(
        "flex gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        !hasCover && !hasLogo && "mt-8 sm:mt-12",
        hasCover && !hasLogo && "mt-4",
        !hasCover && hasLogo && "mt-0",
      )}
    >
      {!hasLogo && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
          onClick={handleAddIcon}
        >
          <SmileIcon className="mr-1.5 h-3.5 w-3.5" />
          Add icon
        </Button>
      )}
      {!hasCover && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-6 px-2 text-xs hover:bg-muted"
          onClick={handleAddCover}
        >
          <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
          Add cover
        </Button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// FormHeader (root compound component)
// ---------------------------------------------------------------------------

export interface FormHeaderProps {
  title?: string;
  icon?: string;
  cover?: string;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
  onCoverChange: (cover: string | null) => void;
  children?: ReactNode;
}

const FormHeaderRoot = ({
  title = "",
  icon,
  cover,
  onTitleChange,
  onIconChange,
  onCoverChange,
  children,
}: FormHeaderProps) => {
  const hasCover = !!cover;
  const hasLogo = !!icon;

  const contextValue = useMemo<FormHeaderContextValue>(
    () => ({
      title,
      icon,
      cover,
      hasCover,
      hasLogo,
      onTitleChange,
      onIconChange,
      onCoverChange,
    }),
    [title, icon, cover, hasCover, hasLogo, onTitleChange, onIconChange, onCoverChange],
  );

  return (
    <FormHeaderContext value={contextValue}>
      <div className="group relative w-full flex flex-col mb-4">
        {children ?? (
          <>
            <FormHeaderCover />
            <div
              className={cn("relative px-4 sm:px-14 max-w-[900px] mx-auto w-full flex flex-col")}
            >
              <div className="w-full  sm:px-[max(10px,calc(50%-350px))]">
                <FormHeaderIcon />
                <ActionButtons />
                <FormHeaderTitle />
              </div>
            </div>
          </>
        )}
      </div>
    </FormHeaderContext>
  );
};

// ---------------------------------------------------------------------------
// Assemble compound component
// ---------------------------------------------------------------------------

export const FormHeader = Object.assign(FormHeaderRoot, {
  Cover: FormHeaderCover,
  Icon: FormHeaderIcon,
  Title: FormHeaderTitle,
  Actions: ActionButtons,
});
