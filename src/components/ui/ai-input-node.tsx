import { MarkdownPlugin } from "@platejs/markdown";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { CornerUpLeftIcon } from "lucide-react";
import { KEYS, PathApi } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorRef, usePluginOption } from "platejs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFormGenStream } from "@/components/editor/hooks/use-form-gen-stream";
import { AIInputPlugin } from "@/components/editor/plugins/ai-input-kit";
import { CheckIcon, ImageIcon, Loader2Icon, SparklesIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

type AttachedImage = { url: string; name: string };

export const AIInputElement = (props: PlateElementProps) => {
  const { element } = props;
  const editor = useEditorRef();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track the last submitted prompt so "Try again" can re-run it
  const lastPromptRef = useRef<{ prompt: string; image: AttachedImage | null }>({
    prompt: "",
    image: null,
  });
  // True when streaming has finished and a preview is awaiting accept/reject
  const [hasPendingPreview, setHasPendingPreview] = useState(false);

  const formId = usePluginOption(AIInputPlugin, "formId");
  const path = editor.api.findPath(element);

  // Selection context captured at the moment the ai_input was inserted
  // (e.g. via Cmd+J with selected blocks or text). Stored on the element node.
  const elementSelectionContext = (element as unknown as { selectionContext?: string | null })
    .selectionContext;
  const elementSelectedPaths = (element as unknown as { selectedPaths?: number[][] }).selectedPaths;

  const getEditorContent = useCallback((): string => {
    try {
      return editor.getApi(MarkdownPlugin).markdown.serialize();
    } catch {
      return "";
    }
  }, [editor]);

  const getCapturedPath = useCallback((): number[] => {
    if (!path) return [editor.children.length];
    return PathApi.next(path);
  }, [editor, path]);

  const getSelectionContext = useCallback(
    (): string | null => elementSelectionContext ?? null,
    [elementSelectionContext],
  );

  const getSelectedBlockPaths = useCallback(
    (): number[][] => elementSelectedPaths ?? [],
    [elementSelectedPaths],
  );

  const clearBlockSelection = useCallback(() => {
    try {
      editor.getApi(BlockSelectionPlugin).blockSelection.deselect();
    } catch {
      // best-effort
    }
  }, [editor]);

  const removeSelf = useCallback(() => {
    // Recompute path at call time — rollback() may have shifted nodes around
    const currentPath = editor.api.findPath(element);
    if (!currentPath) return;
    try {
      editor.tf.withoutSaving(() => {
        editor.tf.removeNodes({ at: currentPath });
      });
    } catch {
      // path may be stale
    }
    clearBlockSelection();
  }, [editor, element, clearBlockSelection]);

  const revert = useCallback(() => {
    if (!path) return;
    editor.tf.withoutSaving(() => {
      editor.tf.setNodes({ type: KEYS.p, children: [{ text: "" }] }, { at: path });
    });
    clearBlockSelection();
    setTimeout(() => {
      editor.tf.select(path);
      editor.tf.focus();
    }, 0);
  }, [editor, path, clearBlockSelection]);

  const {
    submit: submitFormGen,
    isLoading,
    stop,
    rollback,
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
    setHasPendingPreview(false);
    removeSelf();
  }, [removeSelf]);

  const handleReject = useCallback(() => {
    discardPreview();
    removeSelf();
  }, [discardPreview, removeSelf]);

  const handleTryAgain = useCallback(() => {
    discardPreview();
    const { prompt, image } = lastPromptRef.current;
    if (prompt) runPrompt(prompt, image);
  }, [discardPreview, runPrompt]);

  const handleStop = useCallback(() => {
    stop?.();
    discardPreview();
  }, [discardPreview, stop]);

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
        revert();
        return;
      }
      if (e.key === "Backspace" && input.length === 0 && !attachedImage) {
        e.preventDefault();
        revert();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [revert, input, attachedImage, handleSubmit],
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

  return (
    <PlateElement {...props} as="div">
      <div
        className={cn(
          "rounded-lg border bg-background shadow-sm transition-colors",
          error && "border-destructive",
        )}
        contentEditable={false}
      >
        {error && <p className="px-3 pt-2 text-xs text-destructive">{error}</p>}

        {elementSelectionContext && !hasPendingPreview && (
          <div className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs text-muted-foreground">
            <SparklesIcon className="size-3.5 shrink-0" />
            <span className="max-w-[400px] truncate">
              {elementSelectedPaths && elementSelectedPaths.length > 0
                ? `${elementSelectedPaths.length} block${elementSelectedPaths.length > 1 ? "s" : ""} selected`
                : elementSelectionContext.length > 80
                  ? `${elementSelectionContext.slice(0, 80)}…`
                  : elementSelectionContext}
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
          <div className="flex items-center gap-2 px-3">
            <div className="flex shrink-0 items-center text-muted-foreground">
              {isLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
            </div>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? "Generating..." : "Ask AI anything..."}
              className={cn(
                "flex h-9 w-full bg-transparent text-sm outline-none",
                "placeholder:text-muted-foreground/60",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label="AI prompt"
            />

            {isLoading && (
              <button
                type="button"
                onClick={handleStop}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-muted"
                aria-label="Stop generation"
              >
                <XIcon className="size-3.5" />
                Stop
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
      {props.children}
    </PlateElement>
  );
};
