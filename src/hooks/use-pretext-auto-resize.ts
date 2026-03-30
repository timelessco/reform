import { useCallback, useEffect, useRef, useMemo } from "react";
import { prepare, layout } from "@chenglou/pretext";

/**
 * Replaces scrollHeight-based auto-resize with canvas-based text measurement
 * via @chenglou/pretext. Avoids layout reflows entirely — uses pure arithmetic
 * after a one-time canvas measurement per text change.
 *
 * Returns a ref to attach to the textarea element.
 */
export const usePretextAutoResize = ({
  text,
  font,
  lineHeightPx,
  paddingY = 0,
}: {
  text: string;
  /** CSS font shorthand, e.g. "252 48px 'Timeless Serif'" */
  font: string;
  /** Absolute line-height in px */
  lineHeightPx: number;
  /** Total vertical padding (top + bottom) in px */
  paddingY?: number;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastHeightRef = useRef<number | null>(null);

  // Memoize the prepared text — Pretext's prepare() does canvas measurement once
  const prepared = useMemo(() => {
    if (!text) return null;
    return prepare(text, font);
  }, [text, font]);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // clientWidth reads from the layout cache — doesn't trigger reflow
    // unless the element has pending style changes
    const width = el.clientWidth;
    if (width <= 0) return;

    let newHeight: number;
    if (!prepared) {
      // Empty text — single line
      newHeight = lineHeightPx + paddingY;
    } else {
      const result = layout(prepared, width, lineHeightPx);
      newHeight = result.height + paddingY;
    }

    // Only write to DOM if height actually changed
    if (lastHeightRef.current !== newHeight) {
      lastHeightRef.current = newHeight;
      el.style.height = `${newHeight}px`;
    }
  }, [prepared, lineHeightPx, paddingY]);

  // Resize on text/font change
  useEffect(() => {
    resize();
  }, [resize]);

  // Resize when container width changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      lastHeightRef.current = null; // force recalc on next resize()
      resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);

  return ref;
};
