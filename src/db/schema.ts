import { defineRelations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

// ============================================================================
// Organization Tables (Better Auth Organization Plugin)
// ============================================================================

export const organization = pgTable("organization", {
  id: text().primaryKey(),
  name: text().notNull(),
  slug: text().unique(),
  logo: text(),
  metadata: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable("member", {
  id: text().primaryKey(),
  userId: text().notNull(),
  organizationId: text().notNull(),
  role: text().notNull().default("member"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text().primaryKey(),
  email: text().notNull(),
  inviterId: text().notNull(),
  organizationId: text().notNull(),
  role: text().notNull().default("member"),
  status: text().notNull().default("pending"), // pending, accepted, rejected, canceled
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const todos = pgTable("todos", {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

// Better Auth Tables

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
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
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  activeOrganizationId: text(),
});

export const account = pgTable("account", {
  id: text().primaryKey(),
  userId: text().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  idToken: text(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
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
  lastRefillAt: timestamp({ withTimezone: true }),
  enabled: boolean().default(true),
  rateLimitEnabled: boolean().default(true),
  rateLimitTimeWindow: integer().default(86400000),
  rateLimitMax: integer().default(10),
  requestCount: integer().default(0),
  remaining: integer(),
  lastRequest: timestamp({ withTimezone: true }),
  expiresAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull(),
  permissions: text(),
  metadata: text(),
});

// Workspaces table for organizing forms
export const workspaces = pgTable("workspaces", {
  id: text().primaryKey(),
  organizationId: text().notNull(),
  createdByUserId: text().notNull(),
  name: text().notNull().default("Collection"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Forms table for storing form builder documents
export const forms = pgTable("forms", {
  id: text().primaryKey(), // UUID generated client-side
  createdByUserId: text().notNull(),
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
  deletedAt: timestamp({ withTimezone: true }), // Soft delete timestamp for trash feature
  // Version history fields
  lastPublishedVersionId: text(), // FK to formVersions.id
  publishedContentHash: text(), // Hash for fast change detection
  // --- Public form settings (merged from form_settings) ---
  language: text().default("English").notNull(),
  redirectOnCompletion: boolean().default(false).notNull(),
  redirectUrl: text(),
  redirectDelay: integer().default(0).notNull(),
  progressBar: boolean().default(false).notNull(),
  branding: boolean().default(true).notNull(),
  autoJump: boolean().default(false).notNull(),
  saveAnswersForLater: boolean().default(true).notNull(),
  selfEmailNotifications: boolean().default(false).notNull(),
  notificationEmail: text(),
  respondentEmailNotifications: boolean().default(false).notNull(),
  respondentEmailSubject: text(),
  respondentEmailBody: text(),
  passwordProtect: boolean().default(false).notNull(),
  password: text(),
  closeForm: boolean().default(false).notNull(),
  closedFormMessage: text().default("This form is now closed."),
  closeOnDate: boolean().default(false).notNull(),
  closeDate: text(),
  limitSubmissions: boolean().default(false).notNull(),
  maxSubmissions: integer(),
  preventDuplicateSubmissions: boolean().default(false).notNull(),
  dataRetention: boolean().default(false).notNull(),
  dataRetentionDays: integer(),
  customization: jsonb().default({}),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Form Versions table for storing published snapshots
export const formVersions = pgTable("form_versions", {
  id: text().primaryKey(),
  formId: text().notNull(),
  version: integer().notNull(), // v1, v2, v3...
  content: jsonb().notNull(), // Plate.js JSON snapshot
  settings: jsonb().notNull(), // Settings snapshot
  customization: jsonb().default({}), // Theme customization snapshot
  title: text().notNull(),
  publishedByUserId: text().notNull(),
  publishedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Submissions table for storing form responses
export const submissions = pgTable("submissions", {
  id: text().primaryKey(),
  formId: text().notNull(),
  formVersionId: text(), // Links to the form version this submission was created against
  data: jsonb().notNull().default({}),
  isCompleted: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Form Favorites table for per-user favorites
export const formFavorites = pgTable("form_favorites", {
  id: text().primaryKey(), // Format: ${userId}:${formId}
  userId: text().notNull(),
  formId: text()
    .notNull()
    .references(() => forms.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Form Visits Table (Analytics - Raw Events)
// ============================================================================
export const formVisits = pgTable("form_visits", {
  id: text().primaryKey(),
  formId: text().notNull(),

  // Anonymous tracking
  visitorHash: text().notNull(),
  sessionId: text().notNull(),

  // Source attribution
  referrer: text(),
  utmSource: text(),
  utmMedium: text(),
  utmCampaign: text(),

  // Device metadata
  deviceType: text(), // 'desktop' | 'tablet' | 'mobile'
  browser: text(),
  browserVersion: text(),
  os: text(),
  osVersion: text(),

  // Geolocation (country-level, privacy-friendly)
  country: text(),
  countryName: text(),
  city: text(),
  region: text(),

  // Timing
  visitStartedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  visitEndedAt: timestamp({ withTimezone: true }),
  durationMs: integer(),

  // Interaction tracking
  didStartForm: boolean().notNull().default(false),
  didSubmit: boolean().notNull().default(false),
  submissionId: text(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Form Question Progress Table (Question Drop-off Tracking)
// ============================================================================
export const formQuestionProgress = pgTable("form_question_progress", {
  id: text().primaryKey(),
  formId: text().notNull(),
  visitId: text().notNull(),
  visitorHash: text().notNull(),

  questionId: text().notNull(),
  questionType: text(),
  questionIndex: integer().notNull(),

  viewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp({ withTimezone: true }),
  completedAt: timestamp({ withTimezone: true }),
  wasLastQuestion: boolean().notNull().default(false),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Form Analytics Daily Table (Pre-aggregated Daily Metrics)
// ============================================================================
export const formAnalyticsDaily = pgTable("form_analytics_daily", {
  id: text().primaryKey(),
  formId: text().notNull(),
  date: text().notNull(), // 'YYYY-MM-DD'

  // Core metrics
  totalVisits: integer().notNull().default(0),
  uniqueVisitors: integer().notNull().default(0),
  totalSubmissions: integer().notNull().default(0),
  uniqueSubmitters: integer().notNull().default(0),
  avgDurationMs: integer(),
  medianDurationMs: integer(),

  // Device breakdown
  deviceDesktop: integer().default(0),
  deviceMobile: integer().default(0),
  deviceTablet: integer().default(0),

  // Browser breakdown
  browserChrome: integer().default(0),
  browserFirefox: integer().default(0),
  browserSafari: integer().default(0),
  browserEdge: integer().default(0),
  browserOther: integer().default(0),

  // OS breakdown
  osWindows: integer().default(0),
  osMacos: integer().default(0),
  osIos: integer().default(0),
  osAndroid: integer().default(0),
  osLinux: integer().default(0),
  osOther: integer().default(0),

  // Flexible breakdowns (JSONB for many values)
  countryBreakdown: jsonb().notNull().default({}),
  cityBreakdown: jsonb().notNull().default({}),
  sourceBreakdown: jsonb().notNull().default({}),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Form Dropoff Daily Table (Question Drop-off Aggregates)
// ============================================================================
export const formDropoffDaily = pgTable("form_dropoff_daily", {
  id: text().primaryKey(),
  formId: text().notNull(),
  date: text().notNull(), // 'YYYY-MM-DD'
  questionId: text().notNull(),
  questionIndex: integer().notNull(),

  viewCount: integer().notNull().default(0),
  startCount: integer().notNull().default(0),
  completeCount: integer().notNull().default(0),
  dropoffCount: integer().notNull().default(0),
  dropoffRate: integer(), // Percentage * 100
  completionRate: integer(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
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
    organization,
    member,
    invitation,
    forms,
    formVersions,
    workspaces,
    submissions,
    formVisits,
    formQuestionProgress,
    formAnalyticsDaily,
    formDropoffDaily,
    formFavorites,
  },
  (r) => ({
    // User has many sessions, accounts, and forms they created
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
      // Workspaces and forms are now owned by organization, not directly by user
      // But we track who created them
      createdWorkspaces: r.many.workspaces({
        from: r.user.id,
        to: r.workspaces.createdByUserId,
      }),
      createdForms: r.many.forms({
        from: r.user.id,
        to: r.forms.createdByUserId,
      }),
      // Form versions published by user
      publishedVersions: r.many.formVersions({
        from: r.user.id,
        to: r.formVersions.publishedByUserId,
      }),
      // User's memberships in organizations
      members: r.many.member({
        from: r.user.id,
        to: r.member.userId,
      }),
      // Organizations where user is a member
      organizationMemberships: r.many.member({
        from: r.user.id,
        to: r.member.userId,
      }),
      // User's favorited forms
      favorites: r.many.formFavorites({
        from: r.user.id,
        to: r.formFavorites.userId,
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
    // Organization has many members and workspaces
    organization: {
      members: r.many.member({
        from: r.organization.id,
        to: r.member.organizationId,
      }),
      workspaces: r.many.workspaces({
        from: r.organization.id,
        to: r.workspaces.organizationId,
      }),
      invitations: r.many.invitation({
        from: r.organization.id,
        to: r.invitation.organizationId,
      }),
    },
    // Member belongs to one user and one organization
    member: {
      user: r.one.user({
        from: r.member.userId,
        to: r.user.id,
      }),
      organization: r.one.organization({
        from: r.member.organizationId,
        to: r.organization.id,
      }),
    },
    // Invitation belongs to one organization
    invitation: {
      organization: r.one.organization({
        from: r.invitation.organizationId,
        to: r.organization.id,
      }),
    },
    // Workspace belongs to one organization and has many forms
    workspaces: {
      organization: r.one.organization({
        from: r.workspaces.organizationId,
        to: r.organization.id,
      }),
      creator: r.one.user({
        from: r.workspaces.createdByUserId,
        to: r.user.id,
      }),
      forms: r.many.forms({
        from: r.workspaces.id,
        to: r.forms.workspaceId,
      }),
    },
    // Form belongs to one workspace
    forms: {
      creator: r.one.user({
        from: r.forms.createdByUserId,
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
      visits: r.many.formVisits({
        from: r.forms.id,
        to: r.formVisits.formId,
      }),
      analyticsDaily: r.many.formAnalyticsDaily({
        from: r.forms.id,
        to: r.formAnalyticsDaily.formId,
      }),
      dropoffDaily: r.many.formDropoffDaily({
        from: r.forms.id,
        to: r.formDropoffDaily.formId,
      }),
      // Version history
      versions: r.many.formVersions({
        from: r.forms.id,
        to: r.formVersions.formId,
      }),
      currentPublishedVersion: r.one.formVersions({
        from: r.forms.lastPublishedVersionId,
        to: r.formVersions.id,
      }),
      // Users who favorited this form
      favorites: r.many.formFavorites({
        from: r.forms.id,
        to: r.formFavorites.formId,
      }),
    },
    // Form Version belongs to one form and one user (publisher)
    formVersions: {
      form: r.one.forms({
        from: r.formVersions.formId,
        to: r.forms.id,
      }),
      publishedBy: r.one.user({
        from: r.formVersions.publishedByUserId,
        to: r.user.id,
      }),
    },
    // Submission belongs to one form
    submissions: {
      form: r.one.forms({
        from: r.submissions.formId,
        to: r.forms.id,
      }),
    },
    // Form Visits belongs to one form
    formVisits: {
      form: r.one.forms({
        from: r.formVisits.formId,
        to: r.forms.id,
      }),
      submission: r.one.submissions({
        from: r.formVisits.submissionId,
        to: r.submissions.id,
      }),
      questionProgress: r.many.formQuestionProgress({
        from: r.formVisits.id,
        to: r.formQuestionProgress.visitId,
      }),
    },
    // Form Question Progress belongs to form and visit
    formQuestionProgress: {
      form: r.one.forms({
        from: r.formQuestionProgress.formId,
        to: r.forms.id,
      }),
      visit: r.one.formVisits({
        from: r.formQuestionProgress.visitId,
        to: r.formVisits.id,
      }),
    },
    // Form Analytics Daily belongs to form
    formAnalyticsDaily: {
      form: r.one.forms({
        from: r.formAnalyticsDaily.formId,
        to: r.forms.id,
      }),
    },
    // Form Dropoff Daily belongs to form
    formDropoffDaily: {
      form: r.one.forms({
        from: r.formDropoffDaily.formId,
        to: r.forms.id,
      }),
    },
    // Form Favorites belongs to user and form
    formFavorites: {
      user: r.one.user({
        from: r.formFavorites.userId,
        to: r.user.id,
      }),
      form: r.one.forms({
        from: r.formFavorites.formId,
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
export const FormVersionZod = createSelectSchema(formVersions);
export const SubmissionZod = createSelectSchema(submissions);
export const FormVisitsZod = createSelectSchema(formVisits);
export const FormQuestionProgressZod = createSelectSchema(formQuestionProgress);
export const FormAnalyticsDailyZod = createSelectSchema(formAnalyticsDaily);
export const FormDropoffDailyZod = createSelectSchema(formDropoffDaily);

// Organization schemas
export const OrganizationZod = createSelectSchema(organization);
export const MemberZod = createSelectSchema(member);
export const InvitationZod = createSelectSchema(invitation);

// Form Favorites schema
export const FormFavoriteZod = createSelectSchema(formFavorites);
