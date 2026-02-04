ALTER TABLE "forms" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "name" SET DEFAULT 'Collection';