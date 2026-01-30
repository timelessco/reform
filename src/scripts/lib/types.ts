/**
 * Better Forms Popup Embed - Type Definitions
 */

export type PopupPosition = "bottom-right" | "bottom-left" | "center";
export type PopupLayout = "default" | "modal";
export type EmojiAnimation = "wave" | "bounce" | "pulse" | "none";

export interface EmojiOptions {
	text: string;
	animation: EmojiAnimation;
}

export interface PopupOptions {
	/** Layout style: 'default' (corner) or 'modal' (centered) */
	layout?: PopupLayout;
	/** Position for default layout */
	position?: PopupPosition;
	/** Popup width in pixels */
	width?: number;
	/** Align form content to the left */
	alignLeft?: boolean;
	/** Hide the form title */
	hideTitle?: boolean;
	/** Show dark overlay behind popup */
	overlay?: boolean;
	/** Emoji bubble with animation */
	emoji?: EmojiOptions;
	/** Auto-close popup after N milliseconds on submit */
	autoClose?: number;
	/** Hidden fields to pre-fill in the form */
	hiddenFields?: Record<string, string>;
	/** Callback when popup opens */
	onOpen?: () => void;
	/** Callback when popup closes */
	onClose?: () => void;
	/** Callback when form is submitted */
	onSubmit?: (payload: FormSubmitPayload) => void;
	/** Callback on page view (multi-step forms) */
	onPageView?: (page: number) => void;
}

export interface FormSubmitPayload {
	formId: string;
	formName?: string;
	submissionId?: string;
	data?: Record<string, unknown>;
}

export interface PopupInstance {
	formId: string;
	options: PopupOptions;
	container: HTMLElement;
	iframe: HTMLIFrameElement;
	overlay?: HTMLElement;
}

/** Events sent from iframe to parent */
export type IframeEvent =
	| { event: "BetterForms.FormLoaded"; formId: string }
	| { event: "BetterForms.Resize"; height: number }
	| { event: "BetterForms.FormSubmitted"; formId: string; payload: FormSubmitPayload }
	| { event: "BetterForms.PageView"; formId: string; page: number }
	| { event: "BetterForms.Close"; formId: string };

/** Global API exposed on window */
export interface BetterFormsAPI {
	openPopup: (formId: string, options?: PopupOptions) => void;
	closePopup: (formId: string) => void;
}

declare global {
	interface Window {
		BetterForms: BetterFormsAPI;
	}
}
