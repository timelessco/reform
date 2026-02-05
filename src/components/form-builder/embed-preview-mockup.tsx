import type { EmbedType } from "@/hooks/use-editor-sidebar";
import { cn } from "@/lib/utils";

interface EmbedPreviewMockupProps {
  embedType: EmbedType;
  popupPosition?: "bottom-right" | "bottom-left" | "center";
}

export function EmbedPreviewMockup({ embedType, popupPosition = "bottom-right" }: EmbedPreviewMockupProps) {
  return (
    <div className="rounded-xl border bg-muted/20 overflow-hidden shadow-sm">
      {/* Browser Chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-300/60" />
          <div className="h-2 w-2 rounded-full bg-yellow-300/60" />
          <div className="h-2 w-2 rounded-full bg-green-300/60" />
        </div>
        <div className="flex-1 mx-2">
          <div className="h-3.5 bg-muted/50 rounded-full max-w-[140px]" />
        </div>
      </div>

      {/* Content Area */}
      <div className="relative h-[120px] bg-background/50 p-3">
        {embedType === "standard" && <StandardPreview />}
        {embedType === "popup" && <PopupPreview position={popupPosition} />}
        {embedType === "fullpage" && <FullPagePreview />}
      </div>
    </div>
  );
}

function StandardPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {/* Page wireframe with embedded form */}
      <div className="w-full max-w-[180px] space-y-1.5">
        <div className="h-1.5 bg-muted/60 rounded-full w-2/3" />
        <div className="h-1 bg-muted/40 rounded-full w-full" />
        <div className="h-1 bg-muted/40 rounded-full w-4/5" />
      </div>
      {/* Form card */}
      <div className="w-full max-w-[180px] rounded-md border bg-muted/20 p-2 space-y-1.5">
        <div className="h-1.5 bg-muted/50 rounded-full w-1/2" />
        <div className="h-3 bg-muted/30 rounded border border-muted/40" />
        <div className="h-3 bg-muted/30 rounded border border-muted/40" />
        <div className="h-2.5 bg-primary/20 rounded w-1/3 ml-auto" />
      </div>
    </div>
  );
}

function PopupPreview({ position }: { position: string }) {
  return (
    <div className="relative h-full">
      {/* Page wireframe background */}
      <div className="space-y-1.5 opacity-40">
        <div className="h-1.5 bg-muted rounded-full w-1/2" />
        <div className="h-1 bg-muted rounded-full w-3/4" />
        <div className="h-1 bg-muted rounded-full w-2/3" />
        <div className="h-8 bg-muted/50 rounded mt-2" />
      </div>
      {/* Popup card */}
      <div
        className={cn(
          "absolute w-[80px] rounded-md border bg-background shadow-lg p-1.5 space-y-1",
          position === "center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : position === "bottom-left"
              ? "bottom-1 left-1"
              : "bottom-1 right-1",
        )}
      >
        <div className="h-1 bg-muted/60 rounded-full w-3/4" />
        <div className="h-2 bg-muted/30 rounded border border-muted/40" />
        <div className="h-2 bg-muted/30 rounded border border-muted/40" />
        <div className="h-1.5 bg-primary/20 rounded w-1/2 ml-auto" />
      </div>
    </div>
  );
}

function FullPagePreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Form filling the page */}
      <div className="w-full max-w-[160px] space-y-2">
        <div className="h-2 bg-muted/60 rounded-full w-1/2 mx-auto" />
        <div className="space-y-1.5">
          <div className="h-3 bg-muted/30 rounded border border-muted/40" />
          <div className="h-3 bg-muted/30 rounded border border-muted/40" />
          <div className="h-3 bg-muted/30 rounded border border-muted/40" />
        </div>
        <div className="h-3 bg-primary/20 rounded w-1/3 mx-auto" />
      </div>
    </div>
  );
}
