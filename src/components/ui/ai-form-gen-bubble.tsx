import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2Icon, SparklesIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface AIFormGenBubbleProps {
  onSubmit: (prompt: string) => void;
  onClose: () => void;
  isGenerating: boolean;
}

export const AIFormGenBubble = ({ onSubmit, onClose, isGenerating }: AIFormGenBubbleProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitValue = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !isGenerating) {
      onSubmit(trimmed);
    }
  }, [value, isGenerating, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" || (e.key === "k" && (e.metaKey || e.ctrlKey) && e.shiftKey)) {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitValue();
      }
    },
    [onClose, submitValue],
  );

  return (
    <div
      className={cn(
        "fixed bottom-8 left-1/2 z-50 -translate-x-1/2",
        "flex min-w-[400px] max-w-[600px] items-center gap-2",
        "rounded-xl border bg-background/80 px-4 py-2 shadow-lg backdrop-blur-sm",
      )}
    >
      <div className="flex shrink-0 items-center text-muted-foreground">
        {isGenerating ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : (
          <SparklesIcon className="size-5" />
        )}
      </div>

      <input
        ref={inputRef}
        id="ai-form-gen-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating}
        placeholder="Describe the form you want to generate..."
        className={cn(
          "flex-1 bg-transparent text-sm outline-none",
          "placeholder:text-muted-foreground/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        aria-label="AI form generation prompt"
      />

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Close AI form generator"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
};
