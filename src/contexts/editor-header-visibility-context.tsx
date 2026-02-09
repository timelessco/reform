import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

interface EditorHeaderVisibilityContextType {
	enabled: boolean;
	visible: boolean;
	reportTyping: () => void;
	reportPointerActivity: () => void;
	resetVisibility: () => void;
}

const HIDE_DELAY_MS = 0;

const EditorHeaderVisibilityContext = createContext<
	EditorHeaderVisibilityContextType | undefined
>(undefined);

export function EditorHeaderVisibilityProvider({
	enabled,
	children,
}: {
	enabled: boolean;
	children: React.ReactNode;
}) {
	const [visible, setVisible] = useState(true);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearHideTimer = useCallback(() => {
		if (!hideTimerRef.current) return;
		clearTimeout(hideTimerRef.current);
		hideTimerRef.current = null;
	}, []);

	const resetVisibility = useCallback(() => {
		clearHideTimer();
		setVisible(true);
	}, [clearHideTimer]);

	const reportTyping = useCallback(() => {
		if (!enabled) return;
		clearHideTimer();
		hideTimerRef.current = setTimeout(() => {
			setVisible(false);
			hideTimerRef.current = null;
		}, HIDE_DELAY_MS);
	}, [enabled, clearHideTimer]);

	const reportPointerActivity = useCallback(() => {
		if (!enabled) return;
		clearHideTimer();
		setVisible(true);
	}, [enabled, clearHideTimer]);

	useEffect(() => {
		if (enabled) return;
		resetVisibility();
	}, [enabled, resetVisibility]);

	useEffect(() => {
		if (!enabled || visible) return;
		const onMouseMove = () => {
			reportPointerActivity();
		};
		window.addEventListener("mousemove", onMouseMove, { passive: true });
		return () => window.removeEventListener("mousemove", onMouseMove);
	}, [enabled, visible, reportPointerActivity]);

	useEffect(() => {
		return () => {
			clearHideTimer();
		};
	}, [clearHideTimer]);

	return (
		<EditorHeaderVisibilityContext.Provider
			value={{
				enabled,
				visible,
				reportTyping,
				reportPointerActivity,
				resetVisibility,
			}}
		>
			{children}
		</EditorHeaderVisibilityContext.Provider>
	);
}

export function useEditorHeaderVisibility() {
	const context = useContext(EditorHeaderVisibilityContext);
	if (!context) {
		throw new Error(
			"useEditorHeaderVisibility must be used within a EditorHeaderVisibilityProvider",
		);
	}
	return context;
}

export function useEditorHeaderVisibilitySafe() {
	return useContext(EditorHeaderVisibilityContext);
}
