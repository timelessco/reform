-- Rename tallyBranding column to branding (preserves all existing data)
ALTER TABLE "form_settings" RENAME COLUMN "tallyBranding" TO "branding";
