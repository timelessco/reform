import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";

interface EmbedPreviewMockupProps {
  embedType: EmbedType;
  popupPosition?: "bottom-right" | "bottom-left" | "center";
}

export function EmbedPreviewMockup({
  embedType = "fullpage",
  popupPosition = "bottom-right",
}: EmbedPreviewMockupProps) {
  return (
    <div className="rounded-[12px] border border-border bg-[#f5f5f5] dark:bg-muted/30 overflow-hidden">
      {/* Browser Chrome */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
        </div>
      </div>

      {/* Content Area */}
      <div className="relative h-[160px] overflow-hidden p-4">
        {embedType === "standard" && <StandardPreview />}
        {embedType === "popup" && <PopupPreview position={popupPosition} />}
        {embedType === "fullpage" && <FullPagePreview />}
      </div>
    </div>
  );
}

function BoxSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[#e0e0e0] dark:bg-card shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-border/50",
        className
      )}
    />
  );
}

function StandardPreview() {
  return (
    <div className="h-full flex flex-col justify-center gap-4 py-2">
      {/* Abstract Background context */}
      <div className="space-y-2 opacity-30 px-2">
        <div className="h-2 bg-muted rounded-full w-1/4" />
        <div className="h-1.5 bg-muted rounded-full w-full" />
        <div className="h-1.5 bg-muted rounded-full w-4/5" />
      </div>

      {/* The centered "Embed" box */}
      <div className="px-2">
        <BoxSkeleton className="h-16 w-full" />
      </div>

      <div className="space-y-2 opacity-10 px-2">
        <div className="h-1.5 bg-muted rounded-full w-full" />
        <div className="h-1.5 bg-muted rounded-full w-11/12" />
      </div>
    </div>
  );
}

function PopupPreview({ position }: { position: string }) {
  return (
    <div className="relative h-full w-full">
      {/* Abstract Page Background */}
      <div className="space-y-3 opacity-20 pt-2">
        <div className="h-2.5 bg-muted rounded-full w-1/5" />
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full w-full" />
          <div className="h-2 bg-muted rounded-full w-full" />
          <div className="h-2 bg-muted rounded-full w-3/4" />
        </div>
      </div>

      {/* The "Popup" box */}
      <div
        className={cn(
          "absolute transition-all duration-500",
          position === "center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : position === "bottom-left"
              ? "bottom-0 left-0"
              : "bottom-0 right-0"
        )}
      >
        <BoxSkeleton className="h-24 w-[110px]" />
      </div>
    </div>
  );
}

function FullPagePreview() {
  return (
    <div className="h-full flex items-center justify-center pt-2">
      <BoxSkeleton className="h-[120px] w-[180px]" />
    </div>
  );
}
