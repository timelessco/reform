CREATE TABLE "form_favorites" (
	"id" text PRIMARY KEY,
	"userId" text NOT NULL,
	"formId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_favorites" ADD CONSTRAINT "form_favorites_formId_forms_id_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE;