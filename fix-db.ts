import pg from "pg";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function fixSchema() {
	console.log("🛠️ Starting manual schema fix with raw PG...");
	
	const client = new pg.Client({
		connectionString: process.env.DATABASE_URL,
	});

	try {
		await client.connect();
		console.log("✅ Connected to database.");

		// 1. Add Organization Tables
		console.log("Creating organization tables...");
		await client.query(`
			CREATE TABLE IF NOT EXISTS "organization" (
				"id" text PRIMARY KEY NOT NULL,
				"name" text NOT NULL,
				"slug" text UNIQUE,
				"logo" text,
				"metadata" text,
				"createdAt" timestamp DEFAULT now() NOT NULL
			);
		`);

		await client.query(`
			CREATE TABLE IF NOT EXISTS "member" (
				"id" text PRIMARY KEY NOT NULL,
				"userId" text NOT NULL,
				"organizationId" text NOT NULL,
				"role" text DEFAULT 'member' NOT NULL,
				"createdAt" timestamp DEFAULT now() NOT NULL
			);
		`);

		await client.query(`
			CREATE TABLE IF NOT EXISTS "invitation" (
				"id" text PRIMARY KEY NOT NULL,
				"email" text NOT NULL,
				"inviterId" text NOT NULL,
				"organizationId" text NOT NULL,
				"role" text DEFAULT 'member' NOT NULL,
				"status" text DEFAULT 'pending' NOT NULL,
				"expiresAt" timestamp NOT NULL,
				"createdAt" timestamp DEFAULT now() NOT NULL
			);
		`);

		// 2. Add missing columns to existing tables
		console.log("Adding columns to session, workspaces, and forms...");
		
		// Add activeOrganizationId to session
		await client.query(`ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "activeOrganizationId" text;`);
		
		// Add organizationId and createdByUserId to workspaces
		await client.query(`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "organizationId" text;`);
		await client.query(`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "createdByUserId" text;`);
		
		// Add createdByUserId to forms
		await client.query(`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "createdByUserId" text;`);

		console.log("✅ Schema fix completed successfully!");
	} catch (error) {
		console.error("❌ Schema fix failed:", error);
	} finally {
		await client.end();
		process.exit();
	}
}

fixSchema();
