CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'My workspace' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "workspace_id" text NOT NULL;