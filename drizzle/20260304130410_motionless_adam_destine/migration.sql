ALTER TABLE "forms" ADD COLUMN "language" text DEFAULT 'English' NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "redirectOnCompletion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "redirectUrl" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "redirectDelay" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "progressBar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "branding" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "autoJump" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "saveAnswersForLater" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "selfEmailNotifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "notificationEmail" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "respondentEmailNotifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "respondentEmailSubject" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "respondentEmailBody" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "passwordProtect" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "closeForm" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "closedFormMessage" text DEFAULT 'This form is now closed.';--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "closeOnDate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "closeDate" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "limitSubmissions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "maxSubmissions" integer;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "preventDuplicateSubmissions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "dataRetention" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "dataRetentionDays" integer;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "customization" jsonb DEFAULT '{}';--> statement-breakpoint
UPDATE "forms" SET
  "language" = fs."language",
  "redirectOnCompletion" = fs."redirectOnCompletion",
  "redirectUrl" = fs."redirectUrl",
  "redirectDelay" = fs."redirectDelay",
  "progressBar" = fs."progressBar",
  "branding" = fs."branding",
  "autoJump" = fs."autoJump",
  "saveAnswersForLater" = fs."saveAnswersForLater",
  "selfEmailNotifications" = fs."selfEmailNotifications",
  "notificationEmail" = fs."notificationEmail",
  "respondentEmailNotifications" = fs."respondentEmailNotifications",
  "respondentEmailSubject" = fs."respondentEmailSubject",
  "respondentEmailBody" = fs."respondentEmailBody",
  "passwordProtect" = fs."passwordProtect",
  "password" = fs."password",
  "closeForm" = fs."closeForm",
  "closedFormMessage" = fs."closedFormMessage",
  "closeOnDate" = fs."closeOnDate",
  "closeDate" = fs."closeDate",
  "limitSubmissions" = fs."limitSubmissions",
  "maxSubmissions" = fs."maxSubmissions",
  "preventDuplicateSubmissions" = fs."preventDuplicateSubmissions",
  "dataRetention" = fs."dataRetention",
  "dataRetentionDays" = fs."dataRetentionDays",
  "customization" = fs."customization"
FROM "form_settings" fs WHERE fs."formId" = "forms"."id";--> statement-breakpoint
DROP TABLE "form_settings";
