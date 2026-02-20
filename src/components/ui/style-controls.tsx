import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "motion/react";

interface StyleNumberInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    step?: number;
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
    className,
    valueWidth = "60px",
}: StyleNumberInputProps) {
    const match = value?.toString().match(/^(-?\d*\.?\d+)(.*)$/);
    const numValue = match ? parseFloat(match[1]) : 0;
    const unit = match ? match[2] : "";

    const [isDragging, setIsDragging] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const startX = React.useRef(0);
    const startVal = React.useRef(0);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (document.activeElement === inputRef.current) return;
        e.preventDefault();
        setIsDragging(true);
        startX.current = e.clientX;
        startVal.current = numValue;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX.current;
        // Sensitivity adjustment for dragging
        const rawNewValue = startVal.current + Math.round(deltaX / 1) * step;
        const newValue = Math.min(Math.max(rawNewValue, min), max);
        onChange(`${newValue}${unit}`);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        // If it was just a click without moving, focus the input
        if (e.clientX === startX.current) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    };

    const visualMax = max === Infinity ? 1000 : max;
    const visualMin = min === -Infinity ? 0 : min;
    const percentage = Math.max(0, Math.min(100, ((numValue - visualMin) / (visualMax - visualMin)) * 100));

    // Motion values for imperative animation
    const fillPercent = useMotionValue(percentage);
    const fillWidth = useTransform(fillPercent, (pct) => `${pct}%`);
    const handleLeft = useTransform(fillPercent, (pct) => `calc(${pct}% - 2px)`);

    React.useEffect(() => {
        if (!isDragging) {
            animate(fillPercent, percentage, { type: "spring", stiffness: 300, damping: 30, mass: 1 });
        } else {
            fillPercent.jump(percentage);
        }
    }, [percentage, isDragging, fillPercent]);

    const isActive = isHovered || isDragging;

    // Dodge text on the left/right edges to avoid overlapping the label or value
    const valueDodge = percentage < 25 || percentage > 75;

    const handleOpacity = !isActive ? 0 : valueDodge ? 0.3 : isDragging ? 1 : 0.6;

    return (
        <div
            className={cn(
                "relative flex items-center rounded-lg overflow-hidden border border-border/60 bg-transparent h-[34px] text-[13px] select-none cursor-ew-resize group",
                className
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
                animate={{ backgroundColor: isActive ? "hsl(var(--primary) / 0.15)" : "hsl(var(--primary) / 0.1)" }}
                transition={{ duration: 0.15 }}
            />

            {/* Handle spinner */}
            <motion.div
                className="absolute top-1/2 w-[4px] h-[16px] rounded-full pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.1)] mix-blend-multiply dark:mix-blend-screen z-20"
                style={{
                    left: handleLeft,
                    y: "-50%"
                }}
                animate={{
                    opacity: handleOpacity,
                    scaleX: isActive ? 1 : 0.4,
                    scaleY: isActive && valueDodge ? 0.8 : 1.2,
                    backgroundColor: isDragging ? "hsl(var(--foreground) / 0.8)" : "hsl(var(--foreground) / 0.4)"
                }}
                transition={{
                    scaleX: { type: 'spring', visualDuration: 0.25, bounce: 0.15 },
                    scaleY: { type: 'spring', visualDuration: 0.2, bounce: 0.1 },
                    opacity: { duration: 0.15 },
                }}
            />

            {/* Decorative notch lines in the background */}
            <div className="absolute inset-0 flex items-center justify-evenly pointer-events-none opacity-10 mix-blend-multiply dark:mix-blend-screen">
                <div className="w-px h-2 bg-foreground" />
                <div className="w-px h-2 bg-foreground" />
                <div className="w-px h-2 bg-foreground" />
                <div className="w-px h-2 bg-foreground" />
                <div className="w-px h-2 bg-foreground" />
            </div>

            <div className="relative px-3 font-medium text-muted-foreground flex-1 z-10 pointer-events-none transition-colors group-hover:text-foreground">
                {label}
            </div>

            <div className="relative flex-none h-full z-20" style={{ width: valueWidth }}>
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking input
                    className={cn(
                        "absolute inset-0 w-full h-full text-right px-3 bg-transparent outline-none tabular-nums font-mono transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground",
                        "focus:bg-background focus:text-foreground focus:cursor-text"
                    )}
                />
            </div>
        </div>
    );
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
    return (
        <div
            className={cn(
                "flex items-center rounded-[8px] overflow-hidden border border-border/60 bg-transparent h-[32px] text-[13px]",
                className
            )}
        >
            <div className="bg-transparent px-3 h-full flex items-center font-medium text-muted-foreground flex-1 select-none border-r border-border/60">
                {label}
            </div>
            <div className="flex-none px-2 h-full flex items-center gap-2 relative">
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-[60px] text-right bg-transparent outline-none tabular-nums font-mono text-muted-foreground uppercase text-[11px]"
                />
                <div className="w-[18px] h-[18px] rounded-[4px] border border-border/60 overflow-hidden relative shrink-0">
                    <input
                        type="color"
                        value={value?.slice(0, 7) || "#000000"}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute -inset-2 w-10 h-10 opacity-0 cursor-pointer"
                    />
                    <div
                        className="w-full h-full pointer-events-none"
                        style={{ backgroundColor: value }}
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
    options: { label: string; value: string }[];
    className?: string;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);
    const [pos, setPos] = React.useState<{ top: number; left: number; width: number; above: boolean } | null>(null);
    const selectedOption = options.find((o) => o.value === value);

    const updatePos = React.useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dropdownHeight = 8 + options.length * 36;
        const spaceBelow = window.innerHeight - rect.bottom - 4;
        const above = spaceBelow < dropdownHeight && rect.top > spaceBelow;
        setPos({
            top: above ? rect.top - 4 : rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            above,
        });
    }, [options.length]);

    React.useEffect(() => {
        // Portal directly to document.body to avoid parent overflow:hidden or z-index issues
        setPortalTarget(document.body);
    }, []);

    React.useEffect(() => {
        if (!isOpen) return;
        updatePos();

        // Optional: Update position on scroll/resize
        const handleScroll = () => updatePos();
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen, updatePos]);

    React.useEffect(() => {
        if (!isOpen) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    return (
        <div className={cn("relative", className)}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between rounded-lg border border-border/60 bg-transparent h-[34px] px-3 font-medium text-[13px] hover:bg-accent/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isOpen && "bg-accent/50 border-border/80"
                )}
            >
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-foreground">{selectedOption?.label ?? value}</span>
                    <motion.svg
                        className="w-3.5 h-3.5 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.15 }}
                    >
                        <path d="M6 9.5L12 15.5L18 9.5" />
                    </motion.svg>
                </div>
            </button>

            {portalTarget && createPortal(
                <AnimatePresence>
                    {isOpen && pos && (
                        <motion.div
                            ref={dropdownRef}
                            className="bg-background/95 backdrop-blur-md rounded-lg border border-border/60 shadow-lg overflow-hidden z-9999"
                            initial={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: pos.above ? 8 : -8, scale: 0.95 }}
                            transition={{ type: 'spring', visualDuration: 0.15, bounce: 0 }}
                            style={{
                                position: 'fixed',
                                left: pos.left,
                                width: pos.width,
                                ...(pos.above
                                    ? { bottom: window.innerHeight - pos.top, transformOrigin: 'bottom' }
                                    : { top: pos.top, transformOrigin: 'top' }),
                            }}
                        >
                            <div className="p-1 flex flex-col">
                                {options.map((option) => {
                                    const isSelected = option.value === value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={cn(
                                                "w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors flex items-center justify-between group",
                                                isSelected
                                                    ? "bg-primary/10 text-primary font-medium"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                        >
                                            {option.label}
                                            {isSelected && (
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                portalTarget
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
    const [pillStyle, setPillStyle] = React.useState<{ left: number; width: number } | null>(null);
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
                "flex items-center justify-between rounded-lg border border-border/60 bg-transparent h-[34px] px-3 shadow-sm",
                className
            )}
        >
            <span className="font-medium text-muted-foreground text-[13px]">{label}</span>
            <div ref={containerRef} className="relative flex bg-muted/30 rounded-md p-0.5 isolation-auto">
                {pillStyle && (
                    <motion.div
                        className="absolute top-0.5 bottom-0.5 bg-background rounded shadow-sm z-0"
                        style={{ left: pillStyle.left, width: pillStyle.width }}
                        animate={{ left: pillStyle.left, width: pillStyle.width }}
                        transition={
                            hasAnimated.current
                                ? { type: "spring", visualDuration: 0.2, bounce: 0.15 }
                                : { duration: 0 }
                        }
                        onAnimationComplete={() => { hasAnimated.current = true; }}
                    />
                )}
                <button
                    ref={(el) => { if (el) buttonRefs.current.set(false, el); }}
                    type="button"
                    onClick={() => onChange(false)}
                    className={cn(
                        "relative z-10 px-3 py-1 rounded text-[12px] font-medium transition-colors cursor-pointer",
                        !value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Off
                </button>
                <button
                    ref={(el) => { if (el) buttonRefs.current.set(true, el); }}
                    type="button"
                    onClick={() => onChange(true)}
                    className={cn(
                        "relative z-10 px-3 py-1 rounded text-[12px] font-medium transition-colors cursor-pointer",
                        value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
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
    const [pillStyle, setPillStyle] = React.useState<{ left: number; width: number } | null>(null);
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
                "flex items-center rounded-lg overflow-hidden border border-border/60 bg-transparent h-[32px] text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                className
            )}
        >
            <div className="bg-transparent px-3 h-full flex items-center font-medium text-muted-foreground flex-1 select-none border-r border-border/60">
                {label}
            </div>
            <div ref={containerRef} className="flex-none flex items-center h-full px-1 gap-1 relative isolation-auto">
                {pillStyle && (
                    <motion.div
                        className="absolute top-1.5 bottom-1.5 bg-background border border-border/40 rounded shadow-sm z-0"
                        style={{ left: pillStyle.left, width: pillStyle.width }}
                        animate={{ left: pillStyle.left, width: pillStyle.width }}
                        transition={
                            hasAnimated.current
                                ? { type: "spring", visualDuration: 0.2, bounce: 0.15 }
                                : { duration: 0 }
                        }
                        onAnimationComplete={() => { hasAnimated.current = true; }}
                    />
                )}
                <button
                    ref={(el) => { if (el) buttonRefs.current.set("left", el); }}
                    type="button"
                    onClick={() => onChange("left")}
                    className={cn(
                        "relative z-10 p-1.5 rounded flex items-center justify-center transition-colors border border-transparent",
                        value === "left"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <AlignLeft className="w-[14px] h-[14px]" />
                </button>
                <button
                    ref={(el) => { if (el) buttonRefs.current.set("center", el); }}
                    type="button"
                    onClick={() => onChange("center")}
                    className={cn(
                        "relative z-10 p-1.5 rounded flex items-center justify-center transition-colors border border-transparent",
                        value === "center"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <AlignCenter className="w-[14px] h-[14px]" />
                </button>
                <button
                    ref={(el) => { if (el) buttonRefs.current.set("right", el); }}
                    type="button"
                    onClick={() => onChange("right")}
                    className={cn(
                        "relative z-10 p-1.5 rounded flex items-center justify-center transition-colors border border-transparent",
                        value === "right"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <AlignRight className="w-[14px] h-[14px]" />
                </button>
            </div>
        </div>
    );
}
