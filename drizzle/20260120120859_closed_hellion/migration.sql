CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"userId" text NOT NULL,
	"refillInterval" integer,
	"refillAmount" integer,
	"lastRefillAt" timestamp,
	"enabled" boolean DEFAULT true,
	"rateLimitEnabled" boolean DEFAULT true,
	"rateLimitTimeWindow" integer DEFAULT 86400000,
	"rateLimitMax" integer DEFAULT 10,
	"requestCount" integer DEFAULT 0,
	"remaining" integer,
	"lastRequest" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "form_analytics_daily" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL,
	"date" text NOT NULL,
	"totalVisits" integer DEFAULT 0 NOT NULL,
	"uniqueVisitors" integer DEFAULT 0 NOT NULL,
	"totalSubmissions" integer DEFAULT 0 NOT NULL,
	"uniqueSubmitters" integer DEFAULT 0 NOT NULL,
	"avgDurationMs" integer,
	"medianDurationMs" integer,
	"deviceDesktop" integer DEFAULT 0,
	"deviceMobile" integer DEFAULT 0,
	"deviceTablet" integer DEFAULT 0,
	"browserChrome" integer DEFAULT 0,
	"browserFirefox" integer DEFAULT 0,
	"browserSafari" integer DEFAULT 0,
	"browserEdge" integer DEFAULT 0,
	"browserOther" integer DEFAULT 0,
	"osWindows" integer DEFAULT 0,
	"osMacos" integer DEFAULT 0,
	"osIos" integer DEFAULT 0,
	"osAndroid" integer DEFAULT 0,
	"osLinux" integer DEFAULT 0,
	"osOther" integer DEFAULT 0,
	"countryBreakdown" jsonb DEFAULT '{}' NOT NULL,
	"cityBreakdown" jsonb DEFAULT '{}' NOT NULL,
	"sourceBreakdown" jsonb DEFAULT '{}' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_dropoff_daily" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL,
	"date" text NOT NULL,
	"questionId" text NOT NULL,
	"questionIndex" integer NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"startCount" integer DEFAULT 0 NOT NULL,
	"completeCount" integer DEFAULT 0 NOT NULL,
	"dropoffCount" integer DEFAULT 0 NOT NULL,
	"dropoffRate" integer,
	"completionRate" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_question_progress" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL,
	"visitId" text NOT NULL,
	"visitorHash" text NOT NULL,
	"questionId" text NOT NULL,
	"questionType" text,
	"questionIndex" integer NOT NULL,
	"viewedAt" timestamp DEFAULT now() NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"wasLastQuestion" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_settings" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL UNIQUE,
	"language" text DEFAULT 'English' NOT NULL,
	"redirectOnCompletion" boolean DEFAULT false NOT NULL,
	"redirectUrl" text,
	"progressBar" boolean DEFAULT false NOT NULL,
	"tallyBranding" boolean DEFAULT true NOT NULL,
	"dataRetention" boolean DEFAULT false NOT NULL,
	"dataRetentionDays" integer,
	"selfEmailNotifications" boolean DEFAULT false NOT NULL,
	"notificationEmail" text,
	"respondentEmailNotifications" boolean DEFAULT false NOT NULL,
	"respondentEmailSubject" text,
	"respondentEmailBody" text,
	"passwordProtect" boolean DEFAULT false NOT NULL,
	"password" text,
	"closeForm" boolean DEFAULT false NOT NULL,
	"closedFormMessage" text,
	"closeOnDate" boolean DEFAULT false NOT NULL,
	"closeDate" timestamp,
	"limitSubmissions" boolean DEFAULT false NOT NULL,
	"maxSubmissions" integer,
	"preventDuplicateSubmissions" boolean DEFAULT false NOT NULL,
	"duplicateCheckField" text,
	"autoJump" boolean DEFAULT false NOT NULL,
	"saveAnswersForLater" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_share_settings" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL UNIQUE,
	"isPublic" boolean DEFAULT true NOT NULL,
	"expiresAt" timestamp,
	"customTitle" text,
	"customDescription" text,
	"ogImageUrl" text,
	"customDomain" text,
	"customDomainVerified" boolean DEFAULT false NOT NULL,
	"standardEnabled" boolean DEFAULT true NOT NULL,
	"standardWidth" text DEFAULT '100%',
	"standardHeight" text DEFAULT '500px',
	"standardBorderRadius" text DEFAULT '8px',
	"standardShowBorder" boolean DEFAULT true,
	"popupEnabled" boolean DEFAULT false NOT NULL,
	"popupTriggerType" text DEFAULT 'button',
	"popupTriggerDelay" integer,
	"popupTriggerScrollPercent" integer,
	"popupButtonText" text DEFAULT 'Open Form',
	"popupButtonPosition" text DEFAULT 'bottom-right',
	"popupOverlayColor" text DEFAULT 'rgba(0,0,0,0.5)',
	"popupAnimation" text DEFAULT 'fade',
	"fullPageEnabled" boolean DEFAULT false NOT NULL,
	"fullPageBackgroundColor" text,
	"fullPageMaxWidth" text DEFAULT '720px',
	"fullPagePadding" text DEFAULT '2rem',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_visits" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL,
	"visitorHash" text NOT NULL,
	"sessionId" text NOT NULL,
	"referrer" text,
	"utmSource" text,
	"utmMedium" text,
	"utmCampaign" text,
	"deviceType" text,
	"browser" text,
	"browserVersion" text,
	"os" text,
	"osVersion" text,
	"country" text,
	"countryName" text,
	"city" text,
	"region" text,
	"visitStartedAt" timestamp DEFAULT now() NOT NULL,
	"visitEndedAt" timestamp,
	"durationMs" integer,
	"didStartForm" boolean DEFAULT false NOT NULL,
	"didSubmit" boolean DEFAULT false NOT NULL,
	"submissionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" text PRIMARY KEY,
	"createdByUserId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"formName" text DEFAULT 'draft' NOT NULL,
	"schemaName" text DEFAULT 'draftFormSchema' NOT NULL,
	"content" jsonb DEFAULT '[]' NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"icon" text,
	"cover" text,
	"isMultiStep" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"inviterId" text NOT NULL,
	"organizationId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"organizationId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text UNIQUE,
	"logo" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"token" text NOT NULL UNIQUE,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"activeOrganizationId" text
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"isCompleted" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "twoFactor" (
	"id" text PRIMARY KEY,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"username" text UNIQUE,
	"displayUsername" text,
	"twoFactorEnabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY,
	"organizationId" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"name" text DEFAULT 'My workspace' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
