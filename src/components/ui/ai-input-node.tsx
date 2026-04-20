import { MarkdownPlugin } from "@platejs/markdown";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { ArrowUpIcon, CornerUpLeftIcon } from "lucide-react";
import { useEditorRef, usePluginOption } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFormGenStream } from "@/components/editor/hooks/use-form-gen-stream";
import { AIInputPlugin, hideAIInput } from "@/components/editor/plugins/ai-input-kit";
import type { AIInputState } from "@/components/editor/plugins/ai-input-kit";
import { CheckIcon, ImageIcon, Loader2Icon, SparklesIcon, XIcon } from "@/components/ui/icons";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

type AttachedImage = { url: string; name: string };

/**
 * Rendered once as the plugin's `afterEditable` slot. Only mounts the popover
 * body when state.open is true — closing unmounts the body, resetting prompt
 * state without leaving any node behind in the editor tree.
 */
export const AIInputOverlay = () => {
  const state = usePluginOption(AIInputPlugin, "ui");
  if (!state.open) return null;
  return <AIInputPopoverBody state={state} />;
};

const AIInputPopoverBody = ({ state }: { state: AIInputState }) => {
  const editor = useEditorRef();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLElement | null>(state.anchor);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPromptRef = useRef<{ prompt: string; image: AttachedImage | null }>({
    prompt: "",
    image: null,
  });
  const [hasPendingPreview, setHasPendingPreview] = useState(false);
  const [anchorRect, setAnchorRect] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const formId = usePluginOption(AIInputPlugin, "formId");

  useEffect(() => {
    anchorRef.current = state.anchor;
    if (state.anchor) {
      setAnchorRect({
        width: state.anchor.offsetWidth,
        height: state.anchor.offsetHeight,
      });
    }
  }, [state.anchor]);

  const getEditorContent = useCallback((): string => {
    try {
      return editor.getApi(MarkdownPlugin).markdown.serialize();
    } catch {
      return "";
    }
  }, [editor]);

  const getCapturedPath = useCallback((): number[] => state.insertAt, [state.insertAt]);
  const getSelectionContext = useCallback(
    (): string | null => state.selectionContext,
    [state.selectionContext],
  );
  const getSelectedBlockPaths = useCallback(
    (): number[][] => state.selectedPaths,
    [state.selectedPaths],
  );

  const clearBlockSelection = useCallback(() => {
    try {
      editor.getApi(BlockSelectionPlugin).blockSelection.deselect();
    } catch {
      // best-effort
    }
  }, [editor]);

  const hide = useCallback(() => {
    hideAIInput(editor);
    clearBlockSelection();
  }, [editor, clearBlockSelection]);

  const {
    submit: submitFormGen,
    isLoading,
    stop,
    rollback,
    accept,
  } = useFormGenStream({
    editor,
    formId,
    getCapturedPath,
    getEditorContent,
    getSelectionContext,
    getSelectedBlockPaths,
    onFinish: () => {
      setHasPendingPreview(true);
    },
    onError: (message) => {
      setError(message);
      setHasPendingPreview(false);
    },
  });

  const runPrompt = useCallback(
    (prompt: string, image: AttachedImage | null) => {
      setError(null);
      lastPromptRef.current = { prompt, image };
      submitFormGen(prompt, image);
    },
    [submitFormGen],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const processFile = useCallback(
    (file: File): Promise<AttachedImage | null> =>
      new Promise((resolve) => {
        if (!file.type.startsWith("image/")) return resolve(null);
        if (file.size > MAX_FILE_SIZE) return resolve(null);
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          resolve({ url: reader.result as string, name: file.name });
        });
        reader.readAsDataURL(file);
      }),
    [],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;
    const prompt = trimmed || "Extract theme from this image";
    runPrompt(prompt, attachedImage);
    setInput("");
    setAttachedImage(null);
  }, [input, attachedImage, isLoading, runPrompt]);

  const discardPreview = useCallback(() => {
    rollback();
    setHasPendingPreview(false);
  }, [rollback]);

  const handleAccept = useCallback(() => {
    accept();
    setHasPendingPreview(false);
    hide();
  }, [accept, hide]);

  const handleReject = useCallback(() => {
    discardPreview();
    hide();
  }, [discardPreview, hide]);

  const handleTryAgain = useCallback(() => {
    discardPreview();
    const { prompt, image } = lastPromptRef.current;
    if (prompt) runPrompt(prompt, image);
  }, [discardPreview, runPrompt]);

  const handleStop = useCallback(() => {
    stop?.();
    discardPreview();
  }, [discardPreview, stop]);

  // Mirror the previous window-level keybinds so Enter/Cmd+Z/Cmd+R work during a pending preview.
  useEffect(() => {
    if (!hasPendingPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (e.key === "Enter" && !e.shiftKey && !isMod) {
        e.preventDefault();
        e.stopPropagation();
        handleAccept();
      } else if (isMod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleReject();
      } else if (isMod && e.key.toLowerCase() === "r") {
        e.preventDefault();
        e.stopPropagation();
        handleTryAgain();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [hasPendingPreview, handleAccept, handleReject, handleTryAgain]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
        return;
      }
      if (e.key === "Backspace" && input.length === 0 && !attachedImage) {
        e.preventDefault();
        hide();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [hide, input, attachedImage, handleSubmit],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const image = await processFile(file);
      if (!image) return;
      runPrompt("Extract theme from this image", image);
    },
    [processFile, runPrompt],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      // Rollback any in-flight stream / pending preview before dismissing.
      if (isLoading) {
        stop?.();
        rollback();
      } else if (hasPendingPreview) {
        rollback();
      }
      hide();
    },
    [isLoading, hasPendingPreview, stop, rollback, hide],
  );

  return (
    <Popover open onOpenChange={handleOpenChange}>
      <PopoverContent
        anchor={anchorRef}
        align="start"
        side="bottom"
        sideOffset={-anchorRect.height}
        className="z-50 p-0"
        style={{ width: anchorRect.width || undefined }}
      >
        <div
          className={cn(
            "rounded-xl bg-background ring-1 ring-foreground/10 shadow-[0_0_1px_0_rgba(0,0,0,0.19),0_1px_2px_0_rgba(0,0,0,0.07),0_6px_15px_-5px_rgba(0,0,0,0.11)] transition-colors animate-in fade-in-0 zoom-in-95 duration-150",
            error && "ring-destructive",
          )}
        >
          {error && <p className="px-3 pt-2 text-xs text-destructive">{error}</p>}

          {state.selectionContext && !hasPendingPreview && (
            <div className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs text-muted-foreground">
              <SparklesIcon className="size-3.5 shrink-0" />
              <span className="max-w-[400px] truncate">
                {state.selectedPaths.length > 0
                  ? `${state.selectedPaths.length} block${state.selectedPaths.length > 1 ? "s" : ""} selected`
                  : state.selectionContext.length > 80
                    ? `${state.selectionContext.slice(0, 80)}…`
                    : state.selectionContext}
              </span>
            </div>
          )}

          {attachedImage && (
            <div className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" />
              <span className="max-w-[150px] truncate">{attachedImage.name}</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="ml-0.5 rounded p-0.5 hover:bg-muted"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          )}

          {hasPendingPreview ? (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                onClick={handleAccept}
                className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted"
              >
                <CheckIcon className="size-4 text-emerald-600" />
                Accept
                <kbd className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground group-hover:bg-background">
                  ↵
                </kbd>
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted"
              >
                <XIcon className="size-4 text-destructive" />
                Discard
                <kbd className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground group-hover:bg-background">
                  ⌘Z
                </kbd>
              </button>
              <button
                type="button"
                onClick={handleTryAgain}
                className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted"
              >
                <CornerUpLeftIcon className="size-4 text-muted-foreground" />
                Try again
                <kbd className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground group-hover:bg-background">
                  ⌘R
                </kbd>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-4 pr-1.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={isLoading ? "Generating..." : "Ask AI anything..."}
                className={cn(
                  "flex h-10 w-full bg-transparent text-sm outline-none",
                  "placeholder:text-muted-foreground/60",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                aria-label="AI prompt"
              />

              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                  aria-label="Stop generation"
                >
                  <Loader2Icon className="size-3.5 animate-spin" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() && !attachedImage}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:bg-sky-500/40 disabled:cursor-not-allowed"
                  aria-label="Submit prompt"
                >
                  <ArrowUpIcon className="size-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
