ALTER TABLE "form_settings" ADD COLUMN "customization" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "form_versions" ADD COLUMN "customization" jsonb DEFAULT '{}';