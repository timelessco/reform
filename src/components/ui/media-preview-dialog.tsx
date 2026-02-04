import {
  PreviewImage,
  useImagePreview,
  useImagePreviewValue,
  useScaleInput,
} from "@platejs/media/react";
import { cva } from "class-variance-authority";
import { ArrowLeft, ArrowRight, Download, Minus, Plus, X } from "lucide-react";
import { useEditorRef } from "platejs/react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva("rounded bg-[rgba(0,0,0,0.5)] px-1", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "text-white",
      disabled: "cursor-not-allowed text-gray-400",
    },
  },
});

const SCROLL_SPEED = 4;

export function MediaPreviewDialog() {
  const editor = useEditorRef();
  const isOpen = useImagePreviewValue("isOpen", editor.id);
  const scale = useImagePreviewValue("scale");
  const isEditingScale = useImagePreviewValue("isEditingScale");
  const {
    closeProps,
    currentUrlIndex,
    maskLayerProps,
    nextDisabled,
    nextProps,
    prevDisabled,
    prevProps,
    scaleTextProps,
    zommOutProps,
    zoomInDisabled,
    zoomInProps,
    zoomOutDisabled,
  } = useImagePreview({ scrollSpeed: SCROLL_SPEED });

  const previewMaskRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const node = previewMaskRef.current;
    if (!node) return;

    const stopContextMenu = (event: MouseEvent) => {
      event.stopPropagation();
    };

    node.addEventListener("contextmenu", stopContextMenu);
    return () => {
      node.removeEventListener("contextmenu", stopContextMenu);
    };
  }, []);

  return (
    <div
      ref={previewMaskRef}
      className={cn("fixed top-0 left-0 z-50 h-screen w-screen select-none", !isOpen && "hidden")}
    >
      <div className="absolute inset-0 size-full bg-black opacity-30" />
      <div className="absolute inset-0 size-full bg-black opacity-30" />
      <button
        type="button"
        {...maskLayerProps}
        className="absolute inset-0 z-10 bg-transparent"
        aria-label="Close media preview"
      >
        <span className="sr-only">Close preview</span>
      </button>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex max-h-screen w-full items-center">
          <PreviewImage
            className={cn(
              "mx-auto block max-h-[calc(100vh-4rem)] w-auto object-contain transition-transform",
            )}
          />
          <section
            className="-translate-x-1/2 absolute bottom-0 left-1/2 z-40 flex w-fit justify-center gap-4 p-2 text-center text-white"
            aria-label="Media preview controls"
          >
            <div className="flex gap-1">
              <button
                {...prevProps}
                className={cn(
                  buttonVariants({
                    variant: prevDisabled ? "disabled" : "default",
                  }),
                )}
                type="button"
              >
                <ArrowLeft />
              </button>
              {(currentUrlIndex ?? 0) + 1}
              <button
                {...nextProps}
                className={cn(
                  buttonVariants({
                    variant: nextDisabled ? "disabled" : "default",
                  }),
                )}
                type="button"
              >
                <ArrowRight />
              </button>
            </div>
            <div className="flex">
              <button
                className={cn(
                  buttonVariants({
                    variant: zoomOutDisabled ? "disabled" : "default",
                  }),
                )}
                {...zommOutProps}
                type="button"
              >
                <Minus className="size-4" />
              </button>
              <div className="mx-px">
                {isEditingScale ? (
                  <>
                    <ScaleInput className="w-10 rounded px-1 text-slate-500 outline" />{" "}
                    <span>%</span>
                  </>
                ) : (
                  <span {...scaleTextProps}>{`${scale * 100}%`}</span>
                )}
              </div>
              <button
                className={cn(
                  buttonVariants({
                    variant: zoomInDisabled ? "disabled" : "default",
                  }),
                )}
                {...zoomInProps}
                type="button"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {/* TODO: downLoad the image */}
            <button className={cn(buttonVariants())} type="button">
              <Download className="size-4" />
            </button>
            <button {...closeProps} className={cn(buttonVariants())} type="button">
              <X className="size-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function ScaleInput(props: React.ComponentProps<"input">) {
  const { props: scaleInputProps, ref } = useScaleInput();

  return <input {...scaleInputProps} {...props} ref={ref} />;
}
