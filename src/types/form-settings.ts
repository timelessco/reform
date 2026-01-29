// ============================================================================
// Form Settings Types (for type-safe settings)
// ============================================================================

export type Language = "English" | "Spanish" | "French";

export type PopupTriggerType = "button" | "delay" | "scroll";
export type PopupButtonPosition = "bottom-right" | "bottom-left" | "center";
export type PopupAnimation = "fade" | "slide" | "scale";

export type EmbedType = "standard" | "popup" | "fullPage";

// ============================================================================
// Form Settings Interface
// ============================================================================
export interface FormSettings {
	id: string;
	formId: string;

	// General
	language: Language;
	redirectOnCompletion: boolean;
	redirectUrl: string | null;
	progressBar: boolean;
	tallyBranding: boolean;
	dataRetention: boolean;
	dataRetentionDays: number | null;

	// Email Notifications
	selfEmailNotifications: boolean;
	notificationEmail: string | null;
	respondentEmailNotifications: boolean;
	respondentEmailSubject: string | null;
	respondentEmailBody: string | null;

	// Access
	passwordProtect: boolean;
	password: string | null;
	closeForm: boolean;
	closedFormMessage: string | null;
	closeOnDate: boolean;
	closeDate: Date | null;
	limitSubmissions: boolean;
	maxSubmissions: number | null;
	preventDuplicateSubmissions: boolean;
	duplicateCheckField: string | null;

	// Behavior
	autoJump: boolean;
	saveAnswersForLater: boolean;

	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Form Share Settings Interface
// ============================================================================
export interface FormShareSettings {
	id: string;
	formId: string;

	// Visibility & Access
	isPublic: boolean;
	expiresAt: Date | null;

	// Link Preview / OG Metadata
	customTitle: string | null;
	customDescription: string | null;
	ogImageUrl: string | null;

	// Custom Domain (Pro)
	customDomain: string | null;
	customDomainVerified: boolean;

	// Standard Embed
	standardEnabled: boolean;
	standardWidth: string;
	standardHeight: string;
	standardBorderRadius: string;
	standardShowBorder: boolean;

	// Popup Embed
	popupEnabled: boolean;
	popupTriggerType: PopupTriggerType;
	popupTriggerDelay: number | null;
	popupTriggerScrollPercent: number | null;
	popupButtonText: string;
	popupButtonPosition: PopupButtonPosition;
	popupOverlayColor: string;
	popupAnimation: PopupAnimation;

	// Full Page Embed
	fullPageEnabled: boolean;
	fullPageBackgroundColor: string | null;
	fullPageMaxWidth: string;
	fullPagePadding: string;

	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Default Settings Values
// ============================================================================
export const defaultFormSettings: Omit<
	FormSettings,
	"id" | "formId" | "createdAt" | "updatedAt"
> = {
	language: "English",
	redirectOnCompletion: false,
	redirectUrl: null,
	progressBar: false,
	tallyBranding: true,
	dataRetention: false,
	dataRetentionDays: null,
	selfEmailNotifications: false,
	notificationEmail: null,
	respondentEmailNotifications: false,
	respondentEmailSubject: null,
	respondentEmailBody: null,
	passwordProtect: false,
	password: null,
	closeForm: false,
	closedFormMessage: null,
	closeOnDate: false,
	closeDate: null,
	limitSubmissions: false,
	maxSubmissions: null,
	preventDuplicateSubmissions: false,
	duplicateCheckField: null,
	autoJump: false,
	saveAnswersForLater: false,
};

export const defaultFormShareSettings: Omit<
	FormShareSettings,
	"id" | "formId" | "createdAt" | "updatedAt"
> = {
	isPublic: true,
	expiresAt: null,
	customTitle: null,
	customDescription: null,
	ogImageUrl: null,
	customDomain: null,
	customDomainVerified: false,
	standardEnabled: true,
	standardWidth: "100%",
	standardHeight: "500px",
	standardBorderRadius: "8px",
	standardShowBorder: true,
	popupEnabled: false,
	popupTriggerType: "button",
	popupTriggerDelay: null,
	popupTriggerScrollPercent: null,
	popupButtonText: "Open Form",
	popupButtonPosition: "bottom-right",
	popupOverlayColor: "rgba(0,0,0,0.5)",
	popupAnimation: "fade",
	fullPageEnabled: false,
	fullPageBackgroundColor: null,
	fullPageMaxWidth: "720px",
	fullPagePadding: "2rem",
};
