import { pgTable, text, serial, timestamp, boolean, jsonb, integer, primaryKey, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const account = pgTable("account", {
	id: text().primaryKey(),
	userId: text("user_id").notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text(),
	idToken: text("id_token"),
	password: text(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const apikey = pgTable("apikey", {
	id: text().primaryKey(),
	name: text(),
	start: text(),
	prefix: text(),
	key: text().notNull(),
	userId: text("user_id").notNull(),
	refillInterval: integer("refill_interval"),
	refillAmount: integer("refill_amount"),
	lastRefillAt: timestamp("last_refill_at"),
	enabled: boolean().default(true),
	rateLimitEnabled: boolean("rate_limit_enabled").default(true),
	rateLimitTimeWindow: integer("rate_limit_time_window").default(86400000),
	rateLimitMax: integer("rate_limit_max").default(10),
	requestCount: integer("request_count").default(0),
	remaining: integer(),
	lastRequest: timestamp("last_request"),
	expiresAt: timestamp("expires_at"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	permissions: text(),
	metadata: text(),
});

export const forms = pgTable("forms", {
	id: text().primaryKey(),
	userId: text("user_id").notNull(),
	title: text().default("Untitled").notNull(),
	formName: text("form_name").default("draft").notNull(),
	schemaName: text("schema_name").default("draftFormSchema").notNull(),
	content: jsonb().default([]).notNull(),
	settings: jsonb().default({}).notNull(),
	icon: text(),
	cover: text(),
	isMultiStep: boolean("is_multi_step").default(false).notNull(),
	status: text().default("draft").notNull(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const session = pgTable("session", {
	id: text().primaryKey(),
	userId: text("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
}, (table) => [
	unique("session_token_key").on(table.token),]);

export const todos = pgTable("todos", {
	id: serial().primaryKey(),
	title: text().notNull(),
	createdAt: timestamp("created_at").default(sql`now()`),
});

export const twoFactor = pgTable("two_factor", {
	id: text().primaryKey(),
	secret: text().notNull(),
	backupCodes: text("backup_codes").notNull(),
	userId: text("user_id").notNull(),
});

export const user = pgTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
	username: text(),
	displayUsername: text("display_username"),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
}, (table) => [
	unique("user_email_key").on(table.email),	unique("user_username_key").on(table.username),]);

export const verification = pgTable("verification", {
	id: text().primaryKey(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});
