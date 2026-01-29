CREATE TABLE "form_versions" (
	"id" text PRIMARY KEY,
	"formId" text NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"settings" jsonb NOT NULL,
	"title" text NOT NULL,
	"publishedByUserId" text NOT NULL,
	"publishedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "lastPublishedVersionId" text;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "publishedContentHash" text;