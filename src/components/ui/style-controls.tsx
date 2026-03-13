import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from "@/components/ui/icons";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "motion/react";

interface StyleNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Force a specific unit (e.g. "px", "%"). Overrides the unit parsed from the value. */
  unit?: string;
  /** User-facing unit label (e.g. "%" when the internal unit is "vw"). If omitted, no unit is shown. */
  displayUnit?: string;
  className?: string;
  valueWidth?: string;
}

export function StyleNumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100, // Used for visual fill percentage
  step = 1,
  unit: forcedUnit,
  displayUnit,
  className,
  valueWidth = "60px",
}: StyleNumberInputProps) {
  const match = value?.toString().match(/^(-?\d*\.?\d+)(.*)$/);
  const numValue = match ? parseFloat(match[1]) : 0;
  const unit = forcedUnit ?? (match ? match[2] : "");
  const shownUnit = displayUnit ?? unit;

  const [isInteracting, setIsInteracting] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  // Click-vs-drag detection refs
  const pointerDownPos = React.useRef<{ x: number; y: number } | null>(null);
  const isClickRef = React.useRef(true);
  const animRef = React.useRef<ReturnType<typeof animate> | null>(null);
  const wrapperRectRef = React.useRef<DOMRect | null>(null);
  const CLICK_THRESHOLD = 3;

  const visualMax = max === Infinity ? 1000 : max;
  const visualMin = min === -Infinity ? 0 : min;
  const percentage = Math.max(
    0,
    Math.min(100, ((numValue - visualMin) / (visualMax - visualMin)) * 100),
  );

  // Motion values for imperative animation
  const fillPercent = useMotionValue(percentage);
  const fillWidth = useTransform(fillPercent, (pct) => `${pct}%`);
  const handleLeft = useTransform(fillPercent, (pct) => `max(3px, calc(${pct}% - 2.5px))`);

  // Sync fill from props when not interacting
  React.useEffect(() => {
    if (!isInteracting && !animRef.current) {
      fillPercent.jump(percentage);
    }
  }, [percentage, isInteracting, fillPercent]);

  const positionToValue = React.useCallback(
    (clientX: number) => {
      const rect = wrapperRectRef.current;
      if (!rect) return numValue;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = visualMin + pct * (visualMax - visualMin);
      return Math.max(min, Math.min(max, rawValue));
    },
    [min, max, visualMin, visualMax, numValue],
  );

  const percentFromValue = React.useCallback(
    (v: number) => ((v - visualMin) / (visualMax - visualMin)) * 100,
    [visualMin, visualMax],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (document.activeElement === inputRef.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    isClickRef.current = true;
    setIsInteracting(true);

    // Capture rect at pointer down for stable reference during drag
    if (trackRef.current) {
      wrapperRectRef.current = trackRef.current.getBoundingClientRect();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteracting || !pointerDownPos.current) return;

    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Promote to drag once past threshold
    if (isClickRef.current && distance > CLICK_THRESHOLD) {
      isClickRef.current = false;
      setIsDragging(true);
    }

    if (!isClickRef.current) {
      // Drag mode — handle follows cursor position on track (absolute, not delta)
      const newValue = positionToValue(e.clientX);
      const snapped = Math.round(newValue / step) * step;
      const clamped = Math.max(min, Math.min(max, snapped));
      const newPct = percentFromValue(clamped);
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      fillPercent.jump(newPct);
      onChange(`${clamped}${unit}`);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteracting) return;

    if (isClickRef.current) {
      // Click → spring animate to clicked position
      const rawValue = positionToValue(e.clientX);
      const snapped = Math.round(rawValue / step) * step;
      const clamped = Math.max(min, Math.min(max, snapped));
      const newPct = percentFromValue(clamped);

      if (animRef.current) animRef.current.stop();
      animRef.current = animate(fillPercent, newPct, {
        type: "spring",
        stiffness: 300,
        damping: 25,
        mass: 0.8,
        onComplete: () => {
          animRef.current = null;
        },
      });
      onChange(`${clamped}${unit}`);
    }

    setIsInteracting(false);
    setIsDragging(false);
    pointerDownPos.current = null;
  };

  const isActive = isHovered || isInteracting;

  // Dodge text on the left/right edges to avoid overlapping the label or value
  const valueDodge = percentage < 25 || percentage > 75;

  const handleOpacity = !isActive ? 0 : valueDodge ? 0.1 : isDragging ? 0.9 : 0.5;

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex items-center rounded-lg overflow-hidden border border-border/60 bg-transparent h-[34px] text-[13px] select-none cursor-ew-resize group",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Scrubber Fill Bar */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 bg-primary/10 pointer-events-none"
        style={{ width: fillWidth }}
        animate={{
          backgroundColor: isActive ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary) / 0.1)",
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Handle knob */}
      <motion.div
        className="absolute top-1/2 w-[5px] h-[20px] rounded-full pointer-events-none z-20"
        style={{
          left: handleLeft,
          y: "-50%",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        }}
        animate={{
          opacity: handleOpacity,
          scaleX: isActive ? 1 : 0.3,
          scaleY: isActive && valueDodge ? 0.7 : 1,
          backgroundColor: isDragging
            ? "var(--bf-handle-active, rgba(120,120,120,0.9))"
            : "var(--bf-handle-idle, rgba(120,120,120,0.55))",
        }}
        transition={{
          scaleX: { type: "spring", visualDuration: 0.25, bounce: 0.15 },
          scaleY: { type: "spring", visualDuration: 0.2, bounce: 0.1 },
          opacity: { duration: 0.15 },
        }}
      />

      {/* Hash marks at 10%–90% */}
      <div className="absolute inset-0 flex items-center pointer-events-none">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="absolute w-px h-2 bg-foreground opacity-10"
            style={{ left: `${(i + 1) * 10}%` }}
          />
        ))}
      </div>

      <div className="relative px-3 text-muted-foreground flex-1 z-10 pointer-events-none transition-colors group-hover:text-foreground">
        {label}
      </div>

      <div className="relative flex-none h-full z-20" style={{ width: valueWidth }}>
        <input
          ref={inputRef}
          value={`${numValue}${shownUnit}`}
          aria-label={label}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.-]/g, "");
            if (raw === "" || raw === "-") return;
            onChange(`${raw}${unit}`);
          }}
          onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking input
          className={cn(
            "absolute inset-0 w-full h-full text-right px-3 bg-transparent outline-none tabular-nums font-mono transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground",
            "focus:bg-background focus:text-foreground focus:cursor-text",
          )}
        />
      </div>
    </div>
  );
}

/** Convert any CSS color (hex, oklch, rgb, etc.) to #rrggbb for <input type="color"> */
function cssColorToHex(color: string): string {
  if (color?.startsWith("#")) return color.slice(0, 7);
  try {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = color;
    return ctx.fillStyle; // always returns #rrggbb
  } catch {
    return "#000000";
  }
}

export function StyleColorPicker({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const hexColor = cssColorToHex(value);
  const textInputRef = React.useRef<HTMLInputElement>(null);

  // Sync text input from prop changes (without stealing focus)
  React.useEffect(() => {
    if (textInputRef.current && textInputRef.current !== document.activeElement) {
      textInputRef.current.value = hexColor.toUpperCase();
    }
  }, [hexColor]);

  return (
    <div
      className={cn(
        "flex items-center rounded-[8px] overflow-hidden border border-border/60 bg-transparent h-[32px] text-[13px]",
        className,
      )}
    >
      <div className="bg-transparent px-3 h-full flex items-center text-muted-foreground flex-1 select-none">
        {label}
      </div>
      <div className="flex-none px-2 h-full flex items-center gap-2">
        <input
          ref={textInputRef}
          type="text"
          defaultValue={hexColor.toUpperCase()}
          aria-label={`${label} hex value`}
          onChange={(e) => {
            const val = e.target.value.trim();
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
              onChange(val);
            }
          }}
          className="w-[60px] text-right bg-transparent outline-none tabular-nums font-mono text-muted-foreground uppercase text-[11px]"
          maxLength={7}
        />
        <div
          className="relative w-[18px] h-[18px] rounded-[4px] border border-border/60 overflow-hidden shrink-0 cursor-pointer"
          style={{ backgroundColor: hexColor }}
        >
          <input
            type="color"
            value={hexColor}
            aria-label={`${label} color picker`}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}

export function StyleSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: {
    label: string;
    value: string;
    description?: string;
    swatchColor?: string;
  }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);
  const [pos, setPos] = React.useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);
  const selectedOption = options.find((o) => o.value === value);
  const hasDescriptions = options.some((o) => o.description);
  const itemHeight = hasDescriptions ? 60 : 36;

  const updatePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dropdownHeight = 8 + options.length * itemHeight;
    const maxHeight = 320;
    const clampedHeight = Math.min(dropdownHeight, maxHeight);
    const spaceBelow = window.innerHeight - rect.bottom - 4;
    const above = spaceBelow < clampedHeight && rect.top > spaceBelow;
    setPos({
      top: above ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      above,
    });
  }, [options.length, itemHeight]);

  React.useEffect(() => {
    // Portal directly to document.body to avoid parent overflow:hidden or z-index issues
    setPortalTarget(document.body);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    updatePos();

    // Optional: Update position on scroll/resize
    const handleScroll = () => updatePos();
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen, updatePos]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between rounded-lg border border-border/60 bg-transparent h-[34px] px-3 text-[13px] hover:bg-accent/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isOpen && "bg-accent/50 border-border/80",
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2 ml-auto">
          {selectedOption?.swatchColor && (
            <div
              className="w-3.5 h-3.5 rounded-full border border-border/60 shrink-0"
              style={{ backgroundColor: selectedOption.swatchColor }}
            />
          )}
          <span className="text-foreground">{selectedOption?.label ?? value}</span>
          <motion.svg
            className="w-3.5 h-3.5 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", visualDuration: 0.2, bounce: 0.15 }}
          >
            <path d="M6 9.5L12 15.5L18 9.5" />
          </motion.svg>
        </div>
      </button>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {isOpen && pos && (
              <motion.div
                ref={dropdownRef}
                className="bg-background/95 backdrop-blur-md rounded-lg border border-border/60 shadow-lg overflow-hidden z-9999"
                initial={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
                transition={{ type: "spring", visualDuration: 0.15, bounce: 0 }}
                style={{
                  position: "fixed",
                  left: pos.left,
                  width: pos.width,
                  maxHeight: 320,
                  ...(pos.above
                    ? {
                        bottom: window.innerHeight - pos.top,
                        transformOrigin: "bottom",
                      }
                    : { top: pos.top, transformOrigin: "top" }),
                }}
              >
                <div className="p-1 flex flex-col overflow-y-auto max-h-[312px] custom-scrollbar">
                  {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "w-full text-left rounded-md transition-colors flex items-center justify-between group shrink-0",
                          hasDescriptions ? "px-3 py-2.5" : "px-2 py-1.5",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {option.swatchColor && (
                            <div
                              className="w-5 h-5 rounded-full border border-border/60 shrink-0"
                              style={{ backgroundColor: option.swatchColor }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-[13px] capitalize">{option.label}</div>
                            {option.description && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {option.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 shrink-0 ml-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </div>
  );
}

export function StyleToggle({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRefs = React.useRef<Map<boolean, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = React.useState<{
    left: number;
    width: number;
  } | null>(null);
  const hasAnimated = React.useRef(false);

  React.useLayoutEffect(() => {
    const button = buttonRefs.current.get(value);
    const container = containerRef.current;
    if (button && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setPillStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [value]);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border/60 bg-transparent h-[34px] pl-4 pr-1",
        className,
      )}
    >
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <div
        ref={containerRef}
        className="relative flex rounded-md  isolation-auto h-[26px] items-center"
      >
        {pillStyle && (
          <motion.div
            className="absolute top-0.5 bottom-0.5 bg-white/10 rounded z-0"
            style={{ left: pillStyle.left, width: pillStyle.width }}
            animate={{ left: pillStyle.left, width: pillStyle.width }}
            transition={
              hasAnimated.current
                ? { type: "spring", visualDuration: 0.2, bounce: 0.15 }
                : { duration: 0 }
            }
            onAnimationComplete={() => {
              hasAnimated.current = true;
            }}
          />
        )}
        <button
          ref={(el) => {
            if (el) buttonRefs.current.set(false, el);
          }}
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "relative z-10 px-3 h-full rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center min-w-[34px]",
            !value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Off
        </button>
        <button
          ref={(el) => {
            if (el) buttonRefs.current.set(true, el);
          }}
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "relative z-10 px-3 h-full rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center min-w-[34px]",
            value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          On
        </button>
      </div>
    </div>
  );
}

export function StyleAlignToggle({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = React.useState<{
    left: number;
    width: number;
  } | null>(null);
  const hasAnimated = React.useRef(false);

  React.useLayoutEffect(() => {
    const button = buttonRefs.current.get(value);
    const container = containerRef.current;
    if (button && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setPillStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [value]);

  return (
    <div
      className={cn(
        "flex items-center rounded-lg overflow-hidden border border-border/60 bg-transparent h-[32px] text-[13px]",
        className,
      )}
    >
      <div className="bg-transparent px-3 h-full flex items-center text-muted-foreground flex-1 select-none border-r border-border/60">
        {label}
      </div>
      <div
        ref={containerRef}
        className="flex-none flex items-center h-full px-1 gap-1 relative isolation-auto"
      >
        {pillStyle && (
          <motion.div
            className="absolute top-1.5 bottom-1.5 bg-background border border-border/40 rounded z-0"
            style={{ left: pillStyle.left, width: pillStyle.width }}
            animate={{ left: pillStyle.left, width: pillStyle.width }}
            transition={
              hasAnimated.current
                ? { type: "spring", visualDuration: 0.2, bounce: 0.15 }
                : { duration: 0 }
            }
            onAnimationComplete={() => {
              hasAnimated.current = true;
            }}
          />
        )}
        <button
          ref={(el) => {
            if (el) buttonRefs.current.set("left", el);
          }}
          type="button"
          onClick={() => onChange("left")}
          aria-label="Align left"
          className={cn(
            "relative z-10 p-1.5 rounded flex items-center justify-center transition-colors border border-transparent",
            value === "left" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AlignLeftIcon className="w-[14px] h-[14px]" />
        </button>
        <button
          ref={(el) => {
            if (el) buttonRefs.current.set("center", el);
          }}
          type="button"
          onClick={() => onChange("center")}
          aria-label="Align center"
          className={cn(
            "relative z-10 p-1.5 rounded flex items-center justify-center transition-colors border border-transparent",
            value === "center" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AlignCenterIcon className="w-[14px] h-[14px]" />
        </button>
        <button
          ref={(el) => {
            if (el) buttonRefs.current.set("right", el);
          }}
          type="button"
          onClick={() => onChange("right")}
          aria-label="Align right"
          className={cn(
            "relative z-10 p-1.5 rounded flex items-center justify-center transition-colors border border-transparent",
            value === "right" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AlignRightIcon className="w-[14px] h-[14px]" />
        </button>
      </div>
    </div>
  );
}
