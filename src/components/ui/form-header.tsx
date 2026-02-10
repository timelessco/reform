import AvatarUpload from "@/components/file-upload/avatar-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Smile,
  Trash2,
  Upload,
  X,
} from "lucide-react";

// Inline CoverUpload component using the hook
function CoverUpload({ onFileChange }: { onFileChange: (url: string) => void }) {
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
          <Upload className="h-8 w-8" />
          <span className="text-sm font-medium">Upload cover image</span>
          <span className="text-xs">Max 5MB</span>
        </div>
      </button>
      {errors.length > 0 && <div className="text-destructive text-sm">{errors[0]}</div>}
    </div>
  );
}

export interface FormHeaderProps {
  title?: string;
  icon?: string;
  cover?: string;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
  onCoverChange: (cover: string | null) => void;
}

export function FormHeader({
  title = "",
  icon,
  cover,
  onTitleChange,
  onIconChange,
  onCoverChange,
}: FormHeaderProps) {
  const hasCover = !!cover;
  const hasLogo = !!icon;

  const coverUrl = cover;
  const logoUrl = icon;

  const setCoverUrl = (url: string | null) => onCoverChange(url);
  const setLogoUrl = (url: string | null) => onIconChange(url);

  const handleAddCover = () => onCoverChange("#FFE4E1");
  const handleAddIcon = () => onIconChange("default-icon");

  return (
    <div className="group relative w-full flex flex-col mb-4">
      {/* Cover Image Area */}
      {hasCover && (
        <div className="relative w-full h-[120px] sm:h-[200px] group/cover bg-muted/20">
          {coverUrl && !coverUrl.startsWith("#") ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: coverUrl?.startsWith("#") ? coverUrl : "#FFE4E1",
              }}
            />
          )}

          <div className="absolute bottom-2 right-2 opacity-0 group-hover/cover:opacity-100 transition-opacity flex gap-2">
            {/* Change Cover Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/80 hover:bg-white text-xs h-7"
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
                      onClick={() => setCoverUrl("#FFE4E1")}
                      className="h-16 bg-[#FFE4E1] rounded cursor-pointer hover:ring-2 ring-primary transition-all"
                      aria-label="Select blush cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCoverUrl(
                          "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
                        )
                      }
                      className="h-16 bg-blue-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                      aria-label="Select coastal cover"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"
                        alt="Coastal hills cover"
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCoverUrl(
                          "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80",
                        )
                      }
                      className="h-16 bg-purple-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                      aria-label="Select violet cover"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"
                        alt="Violet hills cover"
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCoverUrl(
                          "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
                        )
                      }
                      className="h-16 bg-green-100 rounded cursor-pointer hover:ring-2 ring-primary overflow-hidden transition-all"
                      aria-label="Select green cover"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80"
                        alt="Green meadow cover"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Remove Option in Gallery */}
                    <button
                      type="button"
                      onClick={() => setCoverUrl(null)}
                      className="col-span-4 mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                    >
                      <X className="h-4 w-4" /> Remove cover
                    </button>
                  </TabsContent>
                  <TabsContent value="upload" className="pt-4">
                    <CoverUpload onFileChange={setCoverUrl} />
                    <button
                      type="button"
                      onClick={() => setCoverUrl(null)}
                      className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 border rounded-md hover:bg-muted/50"
                    >
                      <X className="h-4 w-4" /> Remove cover
                    </button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn("relative px-4 sm:px-14 max-w-[900px] mx-auto w-full flex flex-col")}>
        {/* Alignment Wrapper checking Editor padding */}
        <div className="w-full  sm:px-[max(10px,calc(50%-350px))]">
          {/* Logo Element */}
          {hasLogo && (
            <button
              type="button"
              className={cn(
                "relative z-10 mb-4",
                hasCover ? "-mt-[30px] sm:-mt-[40px]" : "mt-6 sm:mt-8",
              )}
            >
              <Dialog>
                <DialogTrigger asChild>
                  <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-full overflow-hidden shadow-sm bg-background cursor-pointer hover:ring-2 hover:ring-muted-foreground/20 transition-all group/logo">
                    {logoUrl && logoUrl !== "default-icon" ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
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
                  </div>
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
                        <X className="mr-2 h-4 w-4" /> Remove icon
                      </Button>
                    </TabsContent>
                    <TabsContent value="upload" className="pt-4 flex flex-col items-center">
                      <AvatarUpload
                        onFileChange={(file) => {
                          if (file?.preview) setLogoUrl(file.preview);
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
          )}

          {/* Action Buttons Group */}
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
                <Smile className="mr-1.5 h-3.5 w-3.5" />
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

          {/* Form Title */}
          <div className="relative group/title">
            <input
              type="text"
              placeholder="Form title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full text-2xl sm:text-4xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/50 py-1 sm:py-2 h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export interface WorkspaceHeaderProps {
  name: string;
  onRename: () => void;
  onDelete: () => void;
  onNewForm: () => void;
  isCreatingForm?: boolean;
}

export function WorkspaceHeader({
  name,
  onRename,
  onDelete,
  onNewForm,
  isCreatingForm,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-12">
      <div className="flex items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{name}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Rename workspace</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 font-medium px-4"
            onClick={onNewForm}
            disabled={isCreatingForm}
          >
            {isCreatingForm ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New form
          </Button>
        </div>
      </div>
    </div>
  );
}
