import { defineRelations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

export const todos = pgTable("todos", {
	id: serial().primaryKey(),
	title: text().notNull(),
	createdAt: timestamp().defaultNow(),
});

// Better Auth Tables

export const user = pgTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean().notNull().default(false),
	image: text(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
	// Username plugin fields
	username: text().unique(),
	displayUsername: text(),
	// Two-factor plugin fields
	twoFactorEnabled: boolean().default(false),
});

export const session = pgTable("session", {
	id: text().primaryKey(),
	userId: text().notNull(),
	token: text().notNull().unique(),
	expiresAt: timestamp().notNull(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});

export const account = pgTable("account", {
	id: text().primaryKey(),
	userId: text().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	accessTokenExpiresAt: timestamp(),
	refreshTokenExpiresAt: timestamp(),
	scope: text(),
	idToken: text(),
	password: text(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});

export const verification = pgTable("verification", {
	id: text().primaryKey(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp().notNull(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});

export const twoFactor = pgTable("twoFactor", {
	id: text().primaryKey(),
	secret: text().notNull(),
	backupCodes: text().notNull(),
	userId: text().notNull(),
});

export const apikey = pgTable("apikey", {
	id: text().primaryKey(),
	name: text(),
	start: text(),
	prefix: text(),
	key: text().notNull(),
	userId: text().notNull(),
	refillInterval: integer(),
	refillAmount: integer(),
	lastRefillAt: timestamp(),
	enabled: boolean().default(true),
	rateLimitEnabled: boolean().default(true),
	rateLimitTimeWindow: integer().default(86400000),
	rateLimitMax: integer().default(10),
	requestCount: integer().default(0),
	remaining: integer(),
	lastRequest: timestamp(),
	expiresAt: timestamp(),
	createdAt: timestamp().notNull(),
	updatedAt: timestamp().notNull(),
	permissions: text(),
	metadata: text(),
});

// Workspaces table for organizing forms
export const workspaces = pgTable("workspaces", {
	id: text().primaryKey(),
	userId: text().notNull(),
	name: text().notNull().default("My workspace"),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});

// Forms table for storing form builder documents
export const forms = pgTable("forms", {
	id: text().primaryKey(), // UUID generated client-side
	userId: text().notNull(),
	workspaceId: text().notNull(),
	title: text().notNull().default("Untitled"),
	formName: text().notNull().default("draft"),
	schemaName: text().notNull().default("draftFormSchema"),
	content: jsonb().notNull().default([]),
	settings: jsonb().notNull().default({}),
	icon: text(),
	cover: text(),
	isMultiStep: boolean().notNull().default(false),
	status: text().notNull().default("draft"), // 'draft' | 'published' | 'archived'
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});

// Submissions table for storing form responses
export const submissions = pgTable("submissions", {
	id: text().primaryKey(),
	formId: text().notNull(),
	data: jsonb().notNull().default({}),
	isCompleted: boolean().notNull().default(true),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
});

// Drizzle v2 Relations using defineRelations
export const relations = defineRelations(
	{
		user,
		session,
		account,
		verification,
		todos,
		twoFactor,
		apikey,
		forms,
		workspaces,
		submissions,
	},
	(r) => ({
		// User has many sessions, accounts, workspaces, and forms
		user: {
			sessions: r.many.session({
				from: r.user.id,
				to: r.session.userId,
			}),
			accounts: r.many.account({
				from: r.user.id,
				to: r.account.userId,
			}),
			twoFactors: r.many.twoFactor({
				from: r.user.id,
				to: r.twoFactor.userId,
			}),
			apikeys: r.many.apikey({
				from: r.user.id,
				to: r.apikey.userId,
			}),
			workspaces: r.many.workspaces({
				from: r.user.id,
				to: r.workspaces.userId,
			}),
			forms: r.many.forms({
				from: r.user.id,
				to: r.forms.userId,
			}),
		},
		// Session belongs to one user
		session: {
			user: r.one.user({
				from: r.session.userId,
				to: r.user.id,
			}),
		},
		// Account belongs to one user
		account: {
			user: r.one.user({
				from: r.account.userId,
				to: r.user.id,
			}),
		},
		// TwoFactor belongs to one user
		twoFactor: {
			user: r.one.user({
				from: r.twoFactor.userId,
				to: r.user.id,
			}),
		},
		// Apikey belongs to one user
		apikey: {
			user: r.one.user({
				from: r.apikey.userId,
				to: r.user.id,
			}),
		},
		// Workspace belongs to one user and has many forms
		workspaces: {
			user: r.one.user({
				from: r.workspaces.userId,
				to: r.user.id,
			}),
			forms: r.many.forms({
				from: r.workspaces.id,
				to: r.forms.workspaceId,
			}),
		},
		// Form belongs to one user and one workspace
		forms: {
			user: r.one.user({
				from: r.forms.userId,
				to: r.user.id,
			}),
			workspace: r.one.workspaces({
				from: r.forms.workspaceId,
				to: r.workspaces.id,
			}),
			submissions: r.many.submissions({
				from: r.forms.id,
				to: r.submissions.formId,
			}),
		},
		// Submission belongs to one form
		submissions: {
			form: r.one.forms({
				from: r.submissions.formId,
				to: r.forms.id,
			}),
		},
	}),
);

// ============================================================================
// Zod Schema Exports (Single Source of Truth)
// ============================================================================

export const WorkspaceZod = createSelectSchema(workspaces);
export const FormZod = createSelectSchema(forms);
export const SubmissionZod = createSelectSchema(submissions);
