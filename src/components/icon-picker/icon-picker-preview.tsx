import { useRef } from "react";

import { getThemeStyleVars } from "@/lib/generate-theme-css";
import { cn, isValidUrl, DEFAULT_ICON, DEFAULT_ICON_NAME } from "@/lib/utils";
import { BLACK_COLOR, iconMap, WHITE_COLOR } from "./icon-data";
import { type IconPickerPreviewProps } from "./types";

/**
 * Swap white/black in dark mode for visibility
 */
const getAdjustedColor = (color: string | undefined, isDarkMode: boolean) => {
	if (!isDarkMode || !color) {
		return color;
	}

	if (color === WHITE_COLOR) {
		return BLACK_COLOR;
	}

	if (color === BLACK_COLOR) {
		return WHITE_COLOR;
	}

	return color;
};

export function IconPickerPreview({
	icon,
	iconColor,
	iconSize = "10",
	size = "14",
	useThemeColor = false,
}: IconPickerPreviewProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isDarkMode = ref.current?.closest(".dark") != null;

	const matchedIcon = icon ? iconMap.get(icon) : undefined;

	if (useThemeColor) {
		return (
			<div
				ref={ref}
				className="flex items-center justify-center rounded-full bg-primary text-primary-foreground"
				style={{
					width: `${size}px`,
					height: `${size}px`,
				}}
			>
				{matchedIcon?.icon("currentColor", iconSize)}
			</div>
		);
	}

	const adjustedBgColor = getAdjustedColor(iconColor, isDarkMode);
	const fillColor = adjustedBgColor === WHITE_COLOR ? BLACK_COLOR : WHITE_COLOR;

	return (
		<div
			ref={ref}
			className="flex items-center justify-center rounded-full"
			style={{
				backgroundColor: adjustedBgColor,
				width: `${size}px`,
				height: `${size}px`,
			}}
		>
			{matchedIcon?.icon(fillColor, iconSize)}
		</div>
	);
}

/**
 * Renders a form icon with optional theme customization.
 * Handles URL images, sprite icons, and the default-icon sentinel.
 */
export function ThemedFormIcon({
	icon,
	customization,
	iconSize = "10",
	size = "18",
}: {
	icon?: string | null;
	customization?: Record<string, string> | null;
	iconSize?: string;
	size?: string;
}) {
	const themeVars = customization && Object.keys(customization).length > 0
		? getThemeStyleVars(customization)
		: undefined;

	if (icon && isValidUrl(icon)) {
		return (
			<img
				src={icon}
				alt=""
				className="rounded-full object-cover shrink-0"
				style={{ width: `${size}px`, height: `${size}px` }}
			/>
		);
	}

	const iconName = icon && icon !== DEFAULT_ICON ? icon : DEFAULT_ICON_NAME;
	const isDark = customization?.mode === "dark";

	return (
		<div style={themeVars} className={cn(themeVars && "bf-themed", themeVars && isDark && "dark")}>
			<IconPickerPreview
				icon={iconName}
				iconColor={undefined}
				useThemeColor
				iconSize={iconSize}
				size={size}
			/>
		</div>
	);
}
